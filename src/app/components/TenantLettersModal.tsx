import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X, ArrowLeft, Calendar, Mail } from "lucide-react";
import {
  generateTerminationNoticePdf,
  generateInspectionAppointmentPdf,
  TERMINATION_REASON_LABEL,
  type TerminationReason,
  type InspectionAppointmentOptions,
} from "../lib/pdf";
import { getLandlordInfo } from "../lib/landlord";
import { type Tenant, type Building } from "../utils/storage";

/**
 * Modal hub for generating official letters from a tenant. Each
 * template is one click away with sensible defaults pre-filled from
 * the lease (tenant name, building, dates, …) so the régie just
 * confirms.
 */

type TemplateKey = "termination" | "inspection-appointment";

const TEMPLATES: { key: TemplateKey; label: string; description: string; icon: React.ElementType }[] = [
  {
    key: "termination",
    label: "Avis de résiliation",
    description: "Notification officielle de fin de bail (CO 266a-l). À envoyer par lettre recommandée.",
    icon: FileText,
  },
  {
    key: "inspection-appointment",
    label: "Convocation état des lieux",
    description: "Confirme la date et les modalités du rendez-vous d'état des lieux.",
    icon: Calendar,
  },
];

export function TenantLettersModal({
  open,
  onClose,
  tenant,
  building,
}: {
  open: boolean;
  onClose: () => void;
  tenant: Tenant;
  building: Building;
}) {
  const [picked, setPicked] = useState<TemplateKey | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setPicked(null);
    onClose();
  };

  const inner = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
          width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {picked && (
              <button
                type="button"
                onClick={() => setPicked(null)}
                title="Retour"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted-foreground)", padding: 4, borderRadius: 7,
                  display: "flex", alignItems: "center",
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <FileText size={18} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
              {picked ? TEMPLATES.find((t) => t.key === picked)?.label : "Lettres officielles"}
            </span>
          </div>
          <button onClick={handleClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", padding: 4, borderRadius: 8,
            display: "flex", alignItems: "center",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px" }}>
          {!picked ? (
            <>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 14px" }}>
                Pour <b>{tenant.name}</b> · {building.name} · {tenant.unit}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => setPicked(tpl.key)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "14px 16px", borderRadius: 12,
                        border: "1px solid var(--border)", background: "var(--background)",
                        cursor: "pointer", textAlign: "left",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
                        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, var(--background))";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.background = "var(--background)";
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon style={{ width: 17, height: 17 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                          {tpl.label}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0", lineHeight: 1.4 }}>
                          {tpl.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : picked === "termination" ? (
            <TerminationForm
              tenant={tenant}
              building={building}
              onCancel={() => setPicked(null)}
              onGenerated={handleClose}
            />
          ) : picked === "inspection-appointment" ? (
            <InspectionForm
              tenant={tenant}
              building={building}
              onCancel={() => setPicked(null)}
              onGenerated={handleClose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(inner, document.body);
}

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

function nextTermDate(): string {
  // Default: 3-month termination at the next calendar end-of-month.
  const d = new Date();
  d.setMonth(d.getMonth() + 3, 0);
  return d.toISOString().slice(0, 10);
}

function TerminationForm({
  tenant, building, onCancel, onGenerated,
}: {
  tenant: Tenant;
  building: Building;
  onCancel: () => void;
  onGenerated: () => void;
}) {
  const [effectiveDate, setEffectiveDate] = useState<string>(nextTermDate());
  const [reason, setReason] = useState<TerminationReason>("ordinaire");
  const [reasonDetails, setReasonDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    if (!effectiveDate) {
      alert("Date d'effet requise.");
      return;
    }
    setBusy(true);
    try {
      await generateTerminationNoticePdf(tenant, building, getLandlordInfo(), {
        effectiveDate,
        reason,
        reasonDetails: reasonDetails.trim() || undefined,
      });
      onGenerated();
    } catch (e) {
      alert(`Erreur: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
        Génère un avis de résiliation officiel à <b>{tenant.name}</b>. À envoyer par <b>lettre recommandée</b> pour faire courir les délais légaux.
      </p>
      <div>
        <label style={labelStyle}>Date d'effet *</label>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          style={inputStyle}
        />
        <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
          Doit être un terme de bail (typiquement le dernier jour de mars, juin ou septembre selon le canton).
        </p>
      </div>
      <div>
        <label style={labelStyle}>Motif</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as TerminationReason)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {Object.entries(TERMINATION_REASON_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Précisions (facultatif)</label>
        <textarea
          value={reasonDetails}
          onChange={(e) => setReasonDetails(e.target.value)}
          rows={3}
          placeholder="Ex: Travaux de rénovation totale prévus à partir du 1er avril 2027..."
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>
      <div style={{
        padding: "10px 12px", borderRadius: 8, fontSize: 11,
        background: "color-mix(in srgb, #F59E0B 10%, transparent)",
        border: "1px solid color-mix(in srgb, #F59E0B 35%, transparent)",
        color: "var(--foreground)",
      }}>
        ⚠ <b>Rappel légal :</b> le locataire dispose de 30 jours pour contester la résiliation auprès de l'autorité de conciliation (art. 271a CO). L'envoi doit se faire par lettre signature pour faire valablement courir le délai.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} style={{
          padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
          background: "var(--background)", color: "var(--foreground)",
          border: "1px solid var(--border)", cursor: "pointer",
        }}>
          Annuler
        </button>
        <button type="button" onClick={handleGenerate} disabled={busy} style={{
          padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
          background: busy ? "var(--border)" : "var(--primary)",
          color: busy ? "var(--muted-foreground)" : "var(--primary-foreground)",
          border: "none", cursor: busy ? "wait" : "pointer",
        }}>
          {busy ? "Génération…" : "Générer le PDF"}
        </button>
      </div>
    </div>
  );
}

function InspectionForm({
  tenant, building, onCancel, onGenerated,
}: {
  tenant: Tenant;
  building: Building;
  onCancel: () => void;
  onGenerated: () => void;
}) {
  const today = new Date();
  today.setDate(today.getDate() + 14);
  const defaultDate = today.toISOString().slice(0, 10);

  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [appointmentType, setAppointmentType] = useState<InspectionAppointmentOptions["appointmentType"]>(tenant.leaseEnd ? "sortie" : "entree");
  const [meetingLocation, setMeetingLocation] = useState(building.address);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    if (!appointmentDate || !appointmentTime) {
      alert("Date et heure requises.");
      return;
    }
    setBusy(true);
    try {
      await generateInspectionAppointmentPdf(tenant, building, getLandlordInfo(), {
        appointmentDate,
        appointmentTime,
        appointmentType,
        meetingLocation: meetingLocation.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onGenerated();
    } catch (e) {
      alert(`Erreur: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
        Convoque <b>{tenant.name}</b> à un état des lieux. Le PDF inclut une checklist adaptée au type de rendez-vous.
      </p>
      <div>
        <label style={labelStyle}>Type</label>
        <select
          value={appointmentType}
          onChange={(e) => setAppointmentType(e.target.value as InspectionAppointmentOptions["appointmentType"])}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="entree">État des lieux d'entrée</option>
          <option value="sortie">État des lieux de sortie</option>
          <option value="intermediaire">État des lieux intermédiaire</option>
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Date *</label>
          <input
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Heure *</label>
          <input
            type="time"
            value={appointmentTime}
            onChange={(e) => setAppointmentTime(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Lieu de rendez-vous</label>
        <input
          type="text"
          value={meetingLocation}
          onChange={(e) => setMeetingLocation(e.target.value)}
          placeholder={building.address}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Notes (facultatif)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex: Merci de prévoir 1 heure pour le rendez-vous..."
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} style={{
          padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
          background: "var(--background)", color: "var(--foreground)",
          border: "1px solid var(--border)", cursor: "pointer",
        }}>
          Annuler
        </button>
        <button type="button" onClick={handleGenerate} disabled={busy} style={{
          padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
          background: busy ? "var(--border)" : "var(--primary)",
          color: busy ? "var(--muted-foreground)" : "var(--primary-foreground)",
          border: "none", cursor: busy ? "wait" : "pointer",
        }}>
          {busy ? "Génération…" : "Générer le PDF"}
        </button>
      </div>
    </div>
  );
}
