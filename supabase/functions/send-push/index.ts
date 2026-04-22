// Deno Edge Function — dispatch Web Push notifications.
// Deploy: supabase functions deploy send-push --no-verify-jwt
//
// Required env (supabase secrets set ...):
//   VAPID_PUBLIC_KEY         (same value as VAPID_PUBLIC_KEY in src/app/lib/push.ts)
//   VAPID_PRIVATE_KEY        (kept server-side only)
//   VAPID_SUBJECT            e.g. "mailto:contact@palier.ch"
//   SUPABASE_URL             (auto-injected by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (read from the function's service role env)
//
// Invocation from the frontend (user JWT in Authorization header):
//   supabase.functions.invoke("send-push", { body: { notificationId } })
//
// The function loads the notification, resolves its target subscribers
// (specific recipient if recipient_id set, otherwise all admins of the org),
// and sends a Web Push payload to each registered subscription. Expired
// endpoints are cleaned up from the push_subscriptions table.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders } from "../_shared/cors.ts";

interface Body {
  notificationId?: string;
  // Manual payload (admin tools / tests): sends to all subscribers of the
  // caller's org without touching the notifications table.
  manual?: {
    title: string;
    body?: string;
    url?: string;
    category?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@palier.ch";

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: "push transport not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch (err) {
    return new Response(JSON.stringify({ error: "invalid vapid keys", details: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Caller auth — require a logged-in user, use their JWT to resolve org.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResp, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userResp.user.id;

    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("organization_id, role")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerProfile?.organization_id) {
      return new Response(JSON.stringify({ error: "no organization for caller" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;

    // Service role client — allowed to read subscriptions across users in the org
    // and delete expired endpoints.
    const admin = createClient(supabaseUrl, supabaseServiceRole);

    let title = "Palier";
    let message: string | null = null;
    let url = "/";
    let category: string | null = null;
    let targetUserIds: string[] = [];

    if (body.notificationId) {
      const { data: notif, error: notifErr } = await admin
        .from("notifications")
        .select("id, organization_id, recipient_id, title, message, category")
        .eq("id", body.notificationId)
        .maybeSingle();
      if (notifErr || !notif) {
        return new Response(JSON.stringify({ error: "notification not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (notif.organization_id !== callerProfile.organization_id) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      title = notif.title ?? title;
      message = notif.message ?? null;
      category = notif.category ?? null;

      if (notif.recipient_id) {
        targetUserIds = [notif.recipient_id];
      } else {
        // Broadcast to all admins of the org.
        const { data: admins } = await admin
          .from("profiles")
          .select("id")
          .eq("organization_id", notif.organization_id)
          .eq("role", "admin");
        targetUserIds = (admins ?? []).map((p: { id: string }) => p.id);
      }
    } else if (body.manual) {
      title = body.manual.title;
      message = body.manual.body ?? null;
      url = body.manual.url ?? "/";
      category = body.manual.category ?? null;
      const { data: admins } = await admin
        .from("profiles")
        .select("id")
        .eq("organization_id", callerProfile.organization_id)
        .eq("role", "admin");
      targetUserIds = (admins ?? []).map((p: { id: string }) => p.id);
    } else {
      return new Response(JSON.stringify({ error: "missing notificationId or manual payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no target users" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", targetUserIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body: message ?? undefined,
      url,
      category: category ?? undefined,
      tag: body.notificationId ?? undefined,
    });

    let sent = 0;
    let removed = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
          removed++;
        }
        // Other errors: ignore for now, don't fail the whole batch.
      }
    }

    return new Response(JSON.stringify({ sent, removed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
