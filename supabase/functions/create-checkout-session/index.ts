// Deno Edge Function — create a Stripe Checkout Session for the caller's organization
// Deploy: supabase functions deploy create-checkout-session
//
// Required env (set with `supabase secrets set ...`):
//   STRIPE_SECRET_KEY         sk_test_...
//   STRIPE_PRICE_STARTER      price_...
//   STRIPE_PRICE_PRO          price_...
//   STRIPE_PRICE_BUSINESS     price_...
//   PUBLIC_APP_URL            https://your-app.vercel.app

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { corsHeaders } from "../_shared/cors.ts";

type Plan = "starter" | "pro" | "business";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICES: Record<Plan, string> = {
  starter: Deno.env.get("STRIPE_PRICE_STARTER")!,
  pro: Deno.env.get("STRIPE_PRICE_PRO")!,
  business: Deno.env.get("STRIPE_PRICE_BUSINESS")!,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { plan } = (await req.json()) as { plan: Plan };
    if (!plan || !PRICES[plan]) {
      return new Response(JSON.stringify({ error: "invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userResp, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, email")
      .eq("id", userResp.user.id)
      .single();
    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "no organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", profile.organization_id)
      .single();

    let customerId = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? userResp.user.email ?? undefined,
        metadata: { organization_id: profile.organization_id },
      });
      customerId = customer.id;
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("organization_id", profile.organization_id);
    }

    const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      success_url: `${appUrl}/?billing=success`,
      cancel_url: `${appUrl}/?billing=canceled`,
      metadata: { organization_id: profile.organization_id, plan },
      subscription_data: {
        metadata: { organization_id: profile.organization_id, plan },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
