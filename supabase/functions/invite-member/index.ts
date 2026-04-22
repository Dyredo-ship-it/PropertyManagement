// Deno Edge Function — create a team invitation and email the invitee a
// signup link. Only super admins can call this.
// Deploy: supabase functions deploy invite-member --no-verify-jwt
//
// Required env (auto-injected by Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional env (Supabase secrets):
//   RESEND_API_KEY, EMAIL_FROM   — to dispatch the invitation email
//   APP_BASE_URL                 — defaults to the Vercel domain

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Body {
  email: string;
  memberRole: "admin" | "manager" | "accountant" | "viewer";
  permissions?: Record<string, "none" | "read" | "write">;
}

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://property-management-rosy.vercel.app";

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResp, error: userErr } = await caller.auth.getUser();
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await caller
      .from("profiles")
      .select("id, organization_id, is_super_admin, full_name, email")
      .eq("id", userResp.user.id)
      .maybeSingle();

    if (!callerProfile?.is_super_admin || !callerProfile.organization_id) {
      return new Response(JSON.stringify({ error: "forbidden — super admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "email invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["admin", "manager", "accountant", "viewer"].includes(body.memberRole)) {
      return new Response(JSON.stringify({ error: "rôle invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRole);

    // Load org name for the email template.
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", callerProfile.organization_id)
      .maybeSingle();

    // ── Seat limit enforcement ──────────────────────────────────
    // Starter = 1 seat (no invites), Pro = 5 seats, Business = unlimited.
    // Seats count admins + pending invitations. Tenants don't count.
    const SEAT_LIMITS: Record<string, number | null> = {
      starter: 1,
      pro: 5,
      business: null,
    };

    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan, status")
      .eq("organization_id", callerProfile.organization_id)
      .maybeSingle();
    const activePlan = sub && (sub.status === "active" || sub.status === "trialing")
      ? sub.plan as string
      : "starter";
    const seatCap = SEAT_LIMITS[activePlan] ?? null;

    if (seatCap !== null) {
      // Count current admin members + pending invitations for this org.
      const [{ count: memberCount }, { count: pendingCount }] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true })
          .eq("organization_id", callerProfile.organization_id)
          .eq("role", "admin"),
        admin.from("organization_invitations").select("id", { count: "exact", head: true })
          .eq("organization_id", callerProfile.organization_id)
          .eq("status", "pending"),
      ]);
      const consumed = (memberCount ?? 0) + (pendingCount ?? 0);
      if (consumed >= seatCap) {
        return new Response(
          JSON.stringify({
            error: "seat_limit_reached",
            message: `Votre plan ${activePlan} est limité à ${seatCap} siège(s). Passez au plan supérieur pour inviter plus de collègues.`,
            plan: activePlan,
            seatCap,
            consumed,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Revoke any existing pending invites for the same email+org (clean replay).
    await admin
      .from("organization_invitations")
      .update({ status: "revoked" })
      .eq("organization_id", callerProfile.organization_id)
      .eq("status", "pending")
      .filter("invited_email", "ilike", email);

    const token = genToken();
    const { data: inserted, error: insertErr } = await admin
      .from("organization_invitations")
      .insert({
        organization_id: callerProfile.organization_id,
        invited_email: email,
        member_role: body.memberRole,
        permissions: body.permissions ?? {},
        token,
        invited_by: callerProfile.id,
      })
      .select("id, token, expires_at")
      .maybeSingle();

    if (insertErr || !inserted) {
      return new Response(JSON.stringify({ error: "insert failed", details: insertErr?.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acceptUrl = `${appBaseUrl}/?invite_token=${encodeURIComponent(token)}`;

    // Send the invitation email (best-effort). Missing transport config is
    // not a hard failure — the caller can still copy the link from the UI.
    let emailSent = false;
    if (resendKey && emailFrom) {
      const inviterName = callerProfile.full_name || callerProfile.email || "Votre collègue";
      const orgName = org?.name || "leur régie";
      const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F4F4F5;padding:24px;color:#1F2937;line-height:1.55;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:32px;">
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Invitation à rejoindre Palier</h2>
    <p>${inviterName} vous invite à rejoindre <strong>${orgName}</strong> sur Palier.</p>
    <p>Cliquez sur le bouton ci-dessous pour créer votre compte ou lier un compte existant :</p>
    <p style="margin:28px 0;text-align:center;">
      <a href="${acceptUrl}" style="display:inline-block;background:#45553A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">
        Accepter l'invitation
      </a>
    </p>
    <p style="font-size:12px;color:#6B7280;">Ce lien expire dans 7 jours.</p>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 12px;" />
    <p style="font-size:11px;color:#9CA3AF;margin:0;">Envoyé par ${inviterName} via Palier.</p>
  </div>
</body></html>`;

      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: emailFrom,
            to: email,
            subject: `Invitation à rejoindre ${orgName} sur Palier`,
            html,
            reply_to: callerProfile.email || undefined,
          }),
        });
        emailSent = resp.ok;
      } catch {
        emailSent = false;
      }
    }

    return new Response(
      JSON.stringify({
        id: inserted.id,
        token,
        expiresAt: inserted.expires_at,
        acceptUrl,
        emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
