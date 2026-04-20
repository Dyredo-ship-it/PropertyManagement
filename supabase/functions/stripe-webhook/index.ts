// Deno Edge Function — Stripe webhook handler
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// (public endpoint, Stripe verifies payload itself)
//
// Required env:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET      (from Stripe CLI or dashboard)
//   SUPABASE_SERVICE_ROLE_KEY  (privileged access to write subscriptions table)

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

type Plan = "starter" | "pro" | "business";

function planFromPriceLookup(priceId: string): Plan {
  // Fall back to metadata if price lookup not configured.
  if (priceId === Deno.env.get("STRIPE_PRICE_STARTER")) return "starter";
  if (priceId === Deno.env.get("STRIPE_PRICE_PRO")) return "pro";
  if (priceId === Deno.env.get("STRIPE_PRICE_BUSINESS")) return "business";
  return "starter";
}

async function upsertSubscription(orgId: string, sub: Stripe.Subscription, plan: Plan) {
  await supabaseAdmin
    .from("subscriptions")
    .update({
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      plan,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    .eq("organization_id", orgId);
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = await stripe.webhooks.constructEventAsync(payload, signature, WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organization_id;
        if (!orgId || !session.subscription) break;
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id ?? "";
        const plan = (sub.metadata?.plan as Plan) || planFromPriceLookup(priceId);
        await upsertSubscription(orgId, sub, plan);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organization_id;
        if (!orgId) break;
        const priceId = sub.items.data[0]?.price.id ?? "";
        const plan = (sub.metadata?.plan as Plan) || planFromPriceLookup(priceId);
        await upsertSubscription(orgId, sub, plan);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organization_id;
        if (!orgId) break;
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled", cancel_at_period_end: false })
          .eq("organization_id", orgId);
        break;
      }
      default:
        break;
    }
    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }
});
