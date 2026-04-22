import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Plan = "starter" | "pro" | "business";

export interface PlanConfig {
  id: Plan;
  name: string;
  priceCHF: number;
  period: "mois" | "an";
  features: string[];
  // teamSeats = total members in the organization (super admin + invitees).
  // null = unlimited. Starter is solo, Pro caps at 5, Business removes the cap.
  limits: { buildings: number | null; tenants: number | null; teamSeats: number | null };
}

export const PLANS: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    priceCHF: 29,
    period: "mois",
    features: [
      "1 bâtiment",
      "10 locataires max",
      "1 utilisateur (solo)",
      "Comptabilité basique",
      "Support email",
    ],
    limits: { buildings: 1, tenants: 10, teamSeats: 1 },
  },
  {
    id: "pro",
    name: "Pro",
    priceCHF: 79,
    period: "mois",
    features: [
      "5 bâtiments",
      "50 locataires",
      "Jusqu'à 5 utilisateurs",
      "Comptabilité complète + export Excel",
      "Demandes de location",
      "Interventions & maintenance",
      "Support prioritaire",
    ],
    limits: { buildings: 5, tenants: 50, teamSeats: 5 },
  },
  {
    id: "business",
    name: "Business",
    priceCHF: 199,
    period: "mois",
    features: [
      "Bâtiments illimités",
      "Locataires illimités",
      "Utilisateurs illimités",
      "Permissions granulaires par membre",
      "Automatisations comptables",
      "API + exports personnalisés",
      "Support dédié",
    ],
    limits: { buildings: null, tenants: null, teamSeats: null },
  },
];

export async function startCheckout(plan: Plan): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan },
  });
  if (error) throw error;
  const url = (data as any)?.url;
  if (!url) throw new Error("Réponse inattendue: pas d'URL de checkout");
  window.location.href = url;
}

export async function openBillingPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-portal-session", {});
  if (error) throw error;
  const url = (data as any)?.url;
  if (!url) throw new Error("Réponse inattendue: pas d'URL de portail");
  window.location.href = url;
}

export interface SubscriptionInfo {
  plan: Plan;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface PlanLimitsState {
  loading: boolean;
  plan: Plan;
  limits: { buildings: number | null; tenants: number | null; teamSeats: number | null };
}

/**
 * Hook returning the active plan + its limits. Defaults to "starter" when
 * the subscription hasn't loaded yet so callers fail-safe (more restrictive).
 */
export function usePlanLimits(): PlanLimitsState {
  const [state, setState] = useState<PlanLimitsState>({
    loading: true,
    plan: "starter",
    limits: PLANS[0].limits,
  });

  useEffect(() => {
    let cancelled = false;
    fetchSubscription().then((sub) => {
      if (cancelled) return;
      const isActive = sub?.status === "active" || sub?.status === "trialing";
      const plan: Plan = isActive && sub?.plan ? sub.plan : "starter";
      const config = PLANS.find((p) => p.id === plan) ?? PLANS[0];
      setState({ loading: false, plan, limits: config.limits });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export async function fetchSubscription(): Promise<SubscriptionInfo | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", uid)
    .maybeSingle();
  const orgId = (profile as any)?.organization_id;
  if (!orgId) return null;
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,cancel_at_period_end")
    .eq("organization_id", orgId)
    .maybeSingle();
  return (data as SubscriptionInfo) ?? null;
}
