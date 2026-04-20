import React from "react";
import { Lock, ArrowRight } from "lucide-react";
import { PLANS, type Plan } from "../lib/billing";

interface PlanLimitModalProps {
  open: boolean;
  onClose: () => void;
  kind: "building" | "tenant";
  currentPlan: Plan;
  limit: number | null;
}

export function PlanLimitModal({
  open,
  onClose,
  kind,
  currentPlan,
  limit,
}: PlanLimitModalProps) {
  if (!open) return null;

  const planConfig = PLANS.find((p) => p.id === currentPlan);
  const planName = planConfig?.name ?? currentPlan;
  const resourceLabel = kind === "building" ? "bâtiment" : "locataire";
  const resourceLabelPlural = kind === "building" ? "bâtiments" : "locataires";

  // Suggest the next tier up.
  const nextPlan = currentPlan === "starter" ? PLANS[1] : currentPlan === "pro" ? PLANS[2] : null;

  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent("navigate-to-billing"));
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: 16,
          padding: 28,
          maxWidth: 460,
          width: "100%",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(99,102,241,0.12)",
            color: "#4338CA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Lock className="w-5 h-5" />
        </div>

        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--foreground)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Limite atteinte
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              margin: "8px 0 0",
              lineHeight: 1.5,
            }}
          >
            Votre plan <strong>{planName}</strong> est limité à{" "}
            <strong>
              {limit} {limit === 1 ? resourceLabel : resourceLabelPlural}
            </strong>
            .
            {nextPlan
              ? ` Passez au plan ${nextPlan.name} pour ${
                  nextPlan.limits[kind === "building" ? "buildings" : "tenants"] === null
                    ? "des " + resourceLabelPlural + " illimités"
                    : "augmenter à " +
                      nextPlan.limits[kind === "building" ? "buildings" : "tenants"] +
                      " " +
                      resourceLabelPlural
                }.`
              : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Voir les plans
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
