import React, { useMemo, useState } from "react";
import {
  FileText, Plus, Trash2, Edit, X, Shield, Flame, Brush, Users, Clock,
  Building as BuildingIcon, AlertCircle, CheckCircle, Zap, Phone, Leaf,
} from "lucide-react";
import {
  getContracts,
  addContract,
  updateContract,
  deleteContract,
  type Contract,
  type ContractType,
  type PaymentFrequency,
  type ContractStatus,
  type Currency,
} from "../utils/storage";
import { useCurrency } from "../context/CurrencyContext";

/**
 * Per-building contracts manager — assurances, chauffage, conciergerie,
 * ascenseur, etc. Sorts by renewal urgency (closest first) and flags
 * contracts within the notice period so the user can opt out in time.
 */

const TYPE_META: Record<ContractType, { label: string; icon: React.ElementType; color: string }> = {
  "assurance-batiment": { label: "Assurance bâtiment", icon: Shield, color: "#2563EB" },
  "assurance-rc":       { label: "Responsabilité civile", icon: Shield, color: "#7C3AED" },
  "assurance-incendie": { label: "Assurance incendie",   icon: Flame,  color: "#DC2626" },
  "chauffage":          { label: "Chauffage",            icon: Flame,  color: "#EA580C" },
  "conciergerie":       { label: "Conciergerie",         icon: Brush,  color: "#0891B2" },
  "ascenseur":          { label: "Ascenseur",            icon: BuildingIcon, color: "#65A30D" },
  "jardinage":          { label: "Jardinage",            icon: Leaf,   color: "#16A34A" },
  "nettoyage":          { label: "Nettoyage",            icon: Brush,  color: "#0EA5E9" },
  "securite":           { label: "Sécurité",             icon: Shield, color: "#B91C1C" },
  "telecom":            { label: "Télécom",              icon: Phone,  color: "#A855F7" },
  "autre":              { label: "Autre",                icon: FileText, color: "#6B7280" },
};

const FREQ_LABEL: Record<PaymentFrequency, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
  "one-time": "Ponctuel",
};

type FormState = {
  id?: string;
  type: ContractType;
  label: string;
  provider: string;
  policyNumber: string;
  startDate: string;
  renewalDate: string;
  noticePeriodDays: number;
  autoRenew: boolean;
  annualAmount: string;
  currency: Currency;
  paymentFrequency: PaymentFrequency;
  notes: string;
  status: ContractStatus;
};

const EMPTY_FORM: FormState = {
  type: "assurance-batiment",
  label: "",
  provider: "",
  policyNumber: "",
  startDate: "",
  renewalDate: "",
  noticePeriodDays: 90,
  autoRenew: true,
  annualAmount: "",
  currency: "CHF",
  paymentFrequency: "yearly",
  notes: "",
  status: "active",
};

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function urgency(contract: Contract): "overdue" | "urgent" | "soon" | "far" | "none" {
  const days = daysUntil(contract.renewalDate);
  if (days == null) return "none";
  const notice = contract.noticePeriodDays || 90;
  if (days < 0) return "overdue";
  if (days <= notice) return "urgent";
  if (days <= notice + 60) return "soon";
  return "far";
}

const URGENCY_STYLE = {
  overdue: { color: "#991B1B", bg: "rgba(220,38,38,0.12)", label: "Renouvellement dépassé" },
  urgent:  { color: "#B45309", bg: "rgba(245,158,11,0.15)", label: "Dans la période de résiliation" },
  soon:    { color: "#D97706", bg: "rgba(217,119,6,0.08)",  label: "Proche" },
  far:     { color: "#16A34A", bg: "rgba(34,197,94,0.08)",  label: "Tranquille" },
  none:    { color: "#6B7280", bg: "var(--background)",     label: "Pas de date" },
} as const;

export function ContractsManager({ buildingId }: { buildingId: string }) {
  const { formatAmount } = useCurrency();
  const [refreshTick, setRefreshTick] = useState(0);
  const [editing, setEditing] = useState<FormState | null>(null);

  const contracts = useMemo(() => {
    const list = getContracts(buildingId);
    return list.slice().sort((a, b) => {
      const da = daysUntil(a.renewalDate);
      const db = daysUntil(b.renewalDate);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, refreshTick]);

  const totals = useMemo(() => {
    const active = contracts.filter((c) => c.status === "active");
    const annual = active.reduce((s, c) => {
      if (!c.annualAmount) return s;
      if (c.paymentFrequency === "monthly") return s + c.annualAmount * 12;
      if (c.paymentFrequency === "quarterly") return s + c.annualAmount * 4;
      return s + c.annualAmount;
    }, 0);
    const urgent = active.filter((c) => {
      const u = urgency(c);
      return u === "urgent" || u === "overdue";
    }).length;
    return { count: active.length, annual, urgent };
  }, [contracts]);

  const handleSave = () => {
    if (!editing) return;
    if (!editing.label.trim()) {
      alert("Un libellé est requis.");
      return;
    }
    const payload: Omit<Contract, "id" | "createdAt" | "updatedAt"> = {
      buildingId,
      type: editing.type,
      label: editing.label.trim(),
      provider: editing.provider.trim() || undefined,
      policyNumber: editing.policyNumber.trim() || undefined,
      startDate: editing.startDate || undefined,
      renewalDate: editing.renewalDate || undefined,
      noticePeriodDays: Number(editing.noticePeriodDays) || 90,
      autoRenew: editing.autoRenew,
      annualAmount: editing.annualAmount ? Number(editing.annualAmount) : undefined,
      currency: editing.currency,
      paymentFrequency: editing.paymentFrequency,
      notes: editing.notes.trim() || undefined,
      status: editing.status,
    };
    if (editing.id) {
      const existing = getContracts().find((c) => c.id === editing.id);
      if (existing) updateContract({ ...existing, ...payload });
    } else {
      addContract(payload);
    }
    setEditing(null);
    setRefreshTick((t) => t + 1);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer ce contrat ?")) return;
    deleteContract(id);
    setRefreshTick((t) => t + 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Contrats & assurances
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
            {totals.count} contrat{totals.count > 1 ? "s" : ""} actif{totals.count > 1 ? "s" : ""}
            {totals.annual > 0 && <> · {formatAmount(totals.annual)}/an</>}
            {totals.urgent > 0 && <> · <b style={{ color: "#DC2626" }}>{totals.urgent} à examiner</b></>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_FORM })}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10,
            background: "var(--primary)", color: "var(--primary-foreground)",
            border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Ajouter
        </button>
      </div>

      {contracts.length === 0 ? (
        <div style={{
          padding: "40px 24px", textAlign: "center", borderRadius: 12,
          border: "1px dashed var(--border)", background: "var(--background)",
          color: "var(--muted-foreground)",
        }}>
          <FileText style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.5 }} />
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Aucun contrat enregistré</p>
          <p style={{ fontSize: 11, margin: "6px 0 0" }}>
            Ajoutez l'assurance bâtiment, le contrat de chauffage, la conciergerie…
            L'app vous rappellera les échéances automatiquement.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contracts.map((c) => (
            <ContractRow
              key={c.id}
              contract={c}
              onEdit={() => setEditing({
                id: c.id,
                type: c.type,
                label: c.label,
                provider: c.provider ?? "",
                policyNumber: c.policyNumber ?? "",
                startDate: c.startDate ?? "",
                renewalDate: c.renewalDate ?? "",
                noticePeriodDays: c.noticePeriodDays,
                autoRenew: c.autoRenew,
                annualAmount: c.annualAmount != null ? String(c.annualAmount) : "",
                currency: c.currency ?? "CHF",
                paymentFrequency: c.paymentFrequency ?? "yearly",
                notes: c.notes ?? "",
                status: c.status,
              })}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ContractFormModal
          form={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ContractRow({
  contract, onEdit, onDelete,
}: {
  contract: Contract;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { formatAmount } = useCurrency();
  const meta = TYPE_META[contract.type];
  const Icon = meta.icon;
  const u = urgency(contract);
  const uStyle = URGENCY_STYLE[u];
  const days = daysUntil(contract.renewalDate);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", borderRadius: 12,
        background: "var(--card)", border: "1px solid var(--border)",
        borderLeft: `4px solid ${meta.color}`,
        flexWrap: "wrap",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${meta.color}15`, color: meta.color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon style={{ width: 18, height: 18 }} />
      </div>

      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{
            fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {contract.label}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
            background: `${meta.color}12`, color: meta.color,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {meta.label}
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
          {contract.provider && <>Fournisseur : {contract.provider}</>}
          {contract.provider && contract.policyNumber && <> · </>}
          {contract.policyNumber && <>N° police : {contract.policyNumber}</>}
          {!contract.provider && !contract.policyNumber && <>—</>}
        </p>
      </div>

      {contract.annualAmount != null && (
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            {formatAmount(contract.annualAmount, contract.currency)}
          </p>
          <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
            {FREQ_LABEL[contract.paymentFrequency ?? "yearly"]}
          </p>
        </div>
      )}

      <div style={{ flexShrink: 0, textAlign: "right", minWidth: 140 }}>
        {contract.renewalDate ? (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: uStyle.color, margin: 0, display: "inline-flex", alignItems: "center", gap: 5 }}>
              {u === "overdue" && <AlertCircle style={{ width: 12, height: 12 }} />}
              {u === "urgent" && <Clock style={{ width: 12, height: 12 }} />}
              {u === "far" && <CheckCircle style={{ width: 12, height: 12 }} />}
              {new Date(contract.renewalDate).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            <p style={{ fontSize: 10, color: uStyle.color, margin: "2px 0 0", fontWeight: 500 }}>
              {days != null && days >= 0 ? `dans ${days} j` : days != null ? `${Math.abs(days)} j dépassé` : ""}
              {contract.autoRenew && " · tacite"}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>
            Pas de date
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onEdit}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "var(--muted-foreground)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Modifier"
        >
          <Edit style={{ width: 13, height: 13 }} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "#DC2626",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Supprimer"
        >
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}

function ContractFormModal({
  form, onChange, onSave, onCancel,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const upd = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    onChange({ ...form, [key]: value });

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "8px 12px", borderRadius: 8, fontSize: 13,
    border: "1px solid var(--border)", background: "var(--background)",
    color: "var(--foreground)", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 650, textTransform: "uppercase",
    letterSpacing: "0.04em", color: "var(--muted-foreground)",
    marginBottom: 4, display: "block",
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
        width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
              {form.id ? "Modifier le contrat" : "Nouveau contrat"}
            </span>
          </div>
          <button onClick={onCancel} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", padding: 4, borderRadius: 8,
            display: "flex", alignItems: "center",
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={(e) => upd("type", e.target.value as ContractType)} style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select value={form.status} onChange={(e) => upd("status", e.target.value as ContractStatus)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="active">Actif</option>
                <option value="expired">Expiré</option>
                <option value="cancelled">Résilié</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Libellé *</label>
            <input type="text" value={form.label} onChange={(e) => upd("label", e.target.value)} placeholder="Ex: Assurance bâtiment HelvetiaSA" style={inputStyle} autoFocus />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Fournisseur</label>
              <input type="text" value={form.provider} onChange={(e) => upd("provider", e.target.value)} placeholder="Helvetia" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>N° police</label>
              <input type="text" value={form.policyNumber} onChange={(e) => upd("policyNumber", e.target.value)} placeholder="B-123456" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Date début</label>
              <input type="date" value={form.startDate} onChange={(e) => upd("startDate", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Prochaine échéance</label>
              <input type="date" value={form.renewalDate} onChange={(e) => upd("renewalDate", e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Préavis (jours)</label>
              <input type="number" min={0} value={form.noticePeriodDays} onChange={(e) => upd("noticePeriodDays", Number(e.target.value))} style={inputStyle} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.autoRenew} onChange={(e) => upd("autoRenew", e.target.checked)} />
                Reconduction tacite
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Montant</label>
              <input type="number" min={0} step={0.01} value={form.annualAmount} onChange={(e) => upd("annualAmount", e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Devise</label>
              <select value={form.currency} onChange={(e) => upd("currency", e.target.value as Currency)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fréquence</label>
              <select value={form.paymentFrequency} onChange={(e) => upd("paymentFrequency", e.target.value as PaymentFrequency)} style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(FREQ_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "14px 22px", borderTop: "1px solid var(--border)",
        }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: "var(--background)", color: "var(--foreground)",
            border: "1px solid var(--border)", cursor: "pointer",
          }}>
            Annuler
          </button>
          <button onClick={onSave} disabled={!form.label.trim()} style={{
            padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: form.label.trim() ? "var(--primary)" : "var(--border)",
            color: form.label.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
            border: "none", cursor: form.label.trim() ? "pointer" : "not-allowed",
          }}>
            {form.id ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
