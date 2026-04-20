import React, { useState } from "react";
import { Building2, Users, Sparkles, Check, ArrowRight, ArrowLeft, X } from "lucide-react";
import {
  getBuildings,
  saveBuildings,
  getTenants,
  saveTenants,
  type Building,
  type Tenant,
} from "../utils/storage";
import { PLANS, startCheckout, type Plan } from "../lib/billing";

interface OnboardingWizardProps {
  userName: string;
  onFinish: () => void;
}

type Step = 1 | 2 | 3;

export function OnboardingWizard({ userName, onFinish }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [createdBuilding, setCreatedBuilding] = useState<Building | null>(null);
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);

  const [building, setBuilding] = useState({
    name: "",
    address: "",
    units: 1,
  });

  const [tenant, setTenant] = useState({
    name: "",
    email: "",
    unit: "",
    rentNet: 0,
  });

  const handleStep1Next = () => {
    if (!building.name.trim() || !building.address.trim()) return;
    const newBuilding: Building = {
      id: Date.now().toString(),
      name: building.name.trim(),
      address: building.address.trim(),
      units: Number(building.units) || 1,
      occupiedUnits: 0,
      monthlyRevenue: 0,
    };
    saveBuildings([...getBuildings(), newBuilding]);
    setCreatedBuilding(newBuilding);
    setStep(2);
  };

  const handleStep2Next = () => {
    if (tenant.name.trim() && tenant.email.trim() && createdBuilding) {
      const newTenant: Tenant = {
        id: Date.now().toString(),
        name: tenant.name.trim(),
        email: tenant.email.trim(),
        phone: "",
        buildingId: createdBuilding.id,
        buildingName: createdBuilding.name,
        unit: tenant.unit.trim(),
        rentNet: Number(tenant.rentNet) || 0,
        charges: 0,
        leaseStart: new Date().toISOString().slice(0, 10),
        status: "active",
        gender: "unspecified",
      };
      saveTenants([...getTenants(), newTenant]);
    }
    setStep(3);
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (plan === "starter") {
      onFinish();
      return;
    }
    setBusyPlan(plan);
    try {
      await startCheckout(plan);
    } catch (e) {
      setBusyPlan(null);
    }
  };

  const stepIcons = [Building2, Users, Sparkles];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--background)",
        zIndex: 100,
        overflowY: "auto",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Skip link */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <button
            type="button"
            onClick={onFinish}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted-foreground)",
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Passer la configuration
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          {[1, 2, 3].map((s) => {
            const Icon = stepIcons[s - 1];
            const active = s === step;
            const done = s < step;
            return (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    background: done
                      ? "var(--primary)"
                      : active
                        ? "rgba(99,102,241,0.15)"
                        : "var(--muted)",
                    color: done
                      ? "var(--primary-foreground)"
                      : active
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    border: active ? "2px solid var(--primary)" : "none",
                  }}
                >
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {s < 3 && (
                  <div
                    style={{
                      width: 40,
                      height: 2,
                      background: done ? "var(--primary)" : "var(--border)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: 32,
          }}
        >
          {step === 1 && (
            <>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Bienvenue {userName.split(" ")[0]} !
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--muted-foreground)",
                  marginTop: 8,
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}
              >
                Commençons par ajouter votre premier bâtiment. Vous pourrez en ajouter d'autres
                ensuite.
              </p>

              <Field label="Nom du bâtiment *">
                <input
                  type="text"
                  value={building.name}
                  onChange={(e) => setBuilding({ ...building, name: e.target.value })}
                  placeholder="Ex: Immeuble Gare 27"
                  style={inputStyle}
                  autoFocus
                />
              </Field>

              <Field label="Adresse *">
                <input
                  type="text"
                  value={building.address}
                  onChange={(e) => setBuilding({ ...building, address: e.target.value })}
                  placeholder="Rue de la Gare 27, 1003 Lausanne"
                  style={inputStyle}
                />
              </Field>

              <Field label="Nombre d'unités">
                <input
                  type="number"
                  min={1}
                  value={building.units}
                  onChange={(e) =>
                    setBuilding({ ...building, units: parseInt(e.target.value, 10) || 1 })
                  }
                  style={inputStyle}
                />
              </Field>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={!building.name.trim() || !building.address.trim()}
                  style={primaryButtonStyle(
                    !building.name.trim() || !building.address.trim(),
                  )}
                >
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Ajoutez votre premier locataire
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--muted-foreground)",
                  marginTop: 8,
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}
              >
                Optionnel — vous pourrez le faire plus tard depuis l'onglet{" "}
                <strong>Locataires</strong>.
              </p>

              <Field label="Nom complet">
                <input
                  type="text"
                  value={tenant.name}
                  onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                  placeholder="Jean Dupont"
                  style={inputStyle}
                  autoFocus
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={tenant.email}
                  onChange={(e) => setTenant({ ...tenant, email: e.target.value })}
                  placeholder="jean.dupont@email.com"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Unité">
                  <input
                    type="text"
                    value={tenant.unit}
                    onChange={(e) => setTenant({ ...tenant, unit: e.target.value })}
                    placeholder="Ex: A12"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Loyer net (CHF)">
                  <input
                    type="number"
                    min={0}
                    value={tenant.rentNet || ""}
                    onChange={(e) =>
                      setTenant({ ...tenant, rentNet: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="0"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={secondaryButtonStyle}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
                <button type="button" onClick={handleStep2Next} style={primaryButtonStyle(false)}>
                  {tenant.name.trim() && tenant.email.trim() ? "Continuer" : "Passer cette étape"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Choisissez votre plan
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--muted-foreground)",
                  marginTop: 8,
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}
              >
                Vous pouvez commencer avec le plan Starter et passer à un plan supérieur quand
                vous voulez.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPlan(p.id)}
                    disabled={busyPlan !== null}
                    style={{
                      textAlign: "left",
                      padding: "16px 18px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      cursor: busyPlan ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      opacity: busyPlan && busyPlan !== p.id ? 0.5 : 1,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--foreground)",
                          margin: 0,
                        }}
                      >
                        {p.name}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--muted-foreground)",
                          margin: "4px 0 0",
                        }}
                      >
                        CHF {p.priceCHF}
                        <span style={{ fontWeight: 400 }}> / {p.period}</span>
                        {" · "}
                        {p.limits.buildings === null
                          ? "bâtiments illimités"
                          : `${p.limits.buildings} bâtiment${p.limits.buildings > 1 ? "s" : ""}`}
                        {" · "}
                        {p.limits.tenants === null
                          ? "locataires illimités"
                          : `${p.limits.tenants} locataires`}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--primary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {busyPlan === p.id
                        ? "Chargement…"
                        : p.id === "starter"
                          ? "Continuer gratuitement"
                          : "Choisir"}
                    </span>
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={secondaryButtonStyle}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 8,
  fontSize: 13,
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  outline: "none",
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "var(--muted)" : "var(--primary)",
    color: disabled ? "var(--muted-foreground)" : "var(--primary-foreground)",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--foreground)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
