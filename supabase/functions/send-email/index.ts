// Deno Edge Function — send transactional emails via Resend.
// Deploy: supabase functions deploy send-email
//
// Required env (set with `supabase secrets set ...`):
//   RESEND_API_KEY        re_xxx
//   EMAIL_FROM            "Palier <noreply@your-domain.com>"
//                         (or "onboarding@resend.dev" while testing)
//
// Frontend usage (with the user's JWT):
//   await supabase.functions.invoke("send-email", {
//     body: { to, subject, html, text }
//   });

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SendEmailBody {
  to: string;
  subject: string;
  html: string;
  text?: string;
  senderName?: string;
  replyTo?: string;
}

// Extract the email address from a "Name <email@domain>" string, or return the value as-is.
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim();
}

// Strip characters that would break an RFC 5322 display-name inside quotes.
function sanitizeSenderName(name: string): string {
  return name.replace(/["\\\r\n]/g, "").trim().slice(0, 64);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Require an authenticated user — only logged-in admins can trigger emails.
    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as SendEmailBody;
    if (!body.to || !body.subject || !body.html) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const defaultFrom = Deno.env.get("EMAIL_FROM");
    if (!apiKey || !defaultFrom) {
      return new Response(JSON.stringify({ error: "email transport not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = body.senderName ? sanitizeSenderName(body.senderName) : "";
    const from = senderName
      ? `${senderName} <${extractEmailAddress(defaultFrom)}>`
      : defaultFrom;

    const replyTo = body.replyTo && isValidEmail(body.replyTo) ? body.replyTo : undefined;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: body.to,
        subject: body.subject,
        html: body.html,
        text: body.text,
        reply_to: replyTo,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "resend failed", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: data.id }), {
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
