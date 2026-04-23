import React, { useEffect, useMemo, useState } from "react";
import { Mail, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import {
  listReminderCases,
  groupByStage,
  recordReminderSent,
  REMINDER_STAGES,
  type ReminderCase,
  type ReminderStage,
} from "../utils/reminderChain";
import { sendReminderForStage, type ReminderStageKey } from "../lib/email";
import { useCurrency } from "../context/CurrencyContext";

/**
 * Kanban-style view of unpaid rents grouped by escalation stage. Each
 * card has a single action: send the appropriate reminder email. After
 * sending, the case moves to "sent at this stage" and will re-appear
 * only once days-late crosses the next threshold.
 */

const AUTO_STAGE_KEYS: Record<ReminderStage, ReminderStageKey | null> = {
  grace: null,
  "rappel-1": "rappel-1",
  "rappel-2": "rappel-2",
  "mise-en-demeure": "mise-en-demeure",
  poursuite: null, // manual legal action, no auto-email
};

export function ReminderChainKanban() {
  const { formatAmount } = useCurrency();
  const [cases, setCases] = useState<ReminderCase[]>(() => listReminderCases());
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Refresh whenever the window regains focus — in case the user sent
  // something elsewhere and came back.
  useEffect(() => {
    const onFocus = () => setCases(listReminderCases());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const grouped = useMemo(() => groupByStage(cases), [cases]);

  // Don't show the grace bucket; always show the four action buckets even
  // when empty so the kanban framing reads regardless of the month's data.
  const columns: ReminderStage[] = ["rappel-1", "rappel-2", "mise-en-demeure", "poursuite"];

  const totalActionNeeded = cases.filter((c) => c.actionNeeded).length;
  const totalAmount = cases.reduce((s, c) => s + c.expectedAmount, 0);

  const handleSend = async (c: ReminderCase) => {
    const emailKey = AUTO_STAGE_KEYS[c.suggestedStage];
    if (!emailKey) {
      alert("Cette étape (Poursuite) doit être initiée manuellement auprès de l'Office des poursuites.");
      return;
    }
    if (!c.tenant.email) {
      alert(`Pas d'email enregistré pour ${c.tenant.name}.`);
      return;
    }
    if (!c.building) {
      alert("Bâtiment introuvable.");
      return;
    }
    const stageInfo = REMINDER_STAGES.find((s) => s.key === c.suggestedStage);
    const confirmed = window.confirm(
      `Envoyer « ${stageInfo?.label} » à ${c.tenant.name} (${c.tenant.email}) pour ${c.monthKey} ?`,
    );
    if (!confirmed) return;

    setSendingId(c.tenant.id + c.monthKey);
    try {
      await sendReminderForStage(emailKey, c.tenant, c.building, c.monthKey);
      recordReminderSent(
        c.tenant.id,
        c.tenant.name,
        c.building.id,
        c.building.name,
        c.monthKey,
        c.suggestedStage,
      );
      setCases(listReminderCases());
    } catch (err) {
      alert(`Échec de l'envoi: ${(err as Error).message}`);
    } finally {
      setSendingId(null);
    }
  };

  if (cases.length === 0) {
    return (
      <div style={{
        borderRadius: 14, border: "1px solid var(--border)",
        background: "var(--card)", padding: "20px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "rgba(34,197,94,0.1)", color: "#16A34A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircle2 style={{ width: 16, height: 16 }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              Aucun rappel requis
            </p>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              Tous les loyers du mois sont à jour ou dans la période de tolérance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 14, border: "1px solid var(--border)",
      background: "var(--card)", padding: "18px 20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: "rgba(220,38,38,0.08)", color: "#DC2626",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle style={{ width: 16, height: 16 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              Chaîne de rappels
            </h3>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              {cases.length} locataire{cases.length > 1 ? "s" : ""} en retard · {formatAmount(totalAmount)} en souffrance
              {totalActionNeeded > 0 && <> · <b style={{ color: "#DC2626" }}>{totalActionNeeded} action{totalActionNeeded > 1 ? "s" : ""} requise{totalActionNeeded > 1 ? "s" : ""}</b></>}
            </p>
          </div>
        </div>
      </div>

      {/* Kanban columns */}
      <div
        className="reminder-kanban"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {columns.map((stage) => {
          const stageInfo = REMINDER_STAGES.find((s) => s.key === stage)!;
          const rows = grouped[stage] ?? [];
          const colTotal = rows.reduce((s, r) => s + r.expectedAmount, 0);
          return (
            <div
              key={stage}
              style={{
                borderRadius: 10,
                border: `1px solid ${stageInfo.color}33`,
                background: stageInfo.bg,
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: 180,
              }}
            >
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: stageInfo.color, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {stageInfo.label}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                    {rows.length} cas · {formatAmount(colTotal)}
                  </p>
                </div>
                <span style={{
                  minWidth: 22, height: 22, borderRadius: 11,
                  background: rows.length > 0 ? stageInfo.color : "var(--border)",
                  color: rows.length > 0 ? "#fff" : "var(--muted-foreground)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, padding: "0 7px",
                }}>
                  {rows.length}
                </span>
              </div>

              {/* Cards */}
              {rows.length === 0 ? (
                <p style={{
                  fontSize: 11, color: "var(--muted-foreground)",
                  fontStyle: "italic", textAlign: "center", margin: "8px 0",
                }}>
                  Aucun cas
                </p>
              ) : (
                rows.map((c) => {
                  const sending = sendingId === c.tenant.id + c.monthKey;
                  const emailKey = AUTO_STAGE_KEYS[c.suggestedStage];
                  const sentAtThisStage = c.lastSentStage === c.suggestedStage;
                  return (
                    <div
                      key={c.tenant.id + c.monthKey}
                      style={{
                        background: "var(--card)",
                        borderRadius: 8,
                        padding: "10px 10px 8px",
                        border: `1px solid ${stageInfo.color}22`,
                        display: "flex", flexDirection: "column", gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 700, color: "var(--foreground)", margin: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0,
                        }}>
                          {c.tenant.name}
                        </p>
                        <span style={{ fontSize: 10, color: stageInfo.color, fontWeight: 700, flexShrink: 0 }}>
                          +{c.daysLate}j
                        </span>
                      </div>
                      <p style={{
                        fontSize: 10, color: "var(--muted-foreground)", margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {c.building?.name} · {c.tenant.unit}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: stageInfo.color, margin: 0 }}>
                        {formatAmount(c.expectedAmount)}
                      </p>
                      {sentAtThisStage && c.lastSentAt && (
                        <p style={{ fontSize: 9, color: "#16A34A", margin: "2px 0 0", fontWeight: 600 }}>
                          ✓ Envoyé le {new Date(c.lastSentAt).toLocaleDateString("fr-CH")}
                        </p>
                      )}
                      <button
                        onClick={() => handleSend(c)}
                        disabled={sending || !emailKey || !c.tenant.email}
                        title={
                          !emailKey
                            ? "À engager manuellement via l'Office des poursuites"
                            : !c.tenant.email
                              ? "Pas d'email enregistré"
                              : sentAtThisStage
                                ? "Renvoyer ce niveau"
                                : "Envoyer"
                        }
                        style={{
                          marginTop: 4,
                          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                          padding: "5px 10px", borderRadius: 7,
                          background: emailKey && c.tenant.email ? stageInfo.color : "var(--background)",
                          color: emailKey && c.tenant.email ? "#fff" : "var(--muted-foreground)",
                          border: "none", fontSize: 11, fontWeight: 600,
                          cursor: sending ? "wait" : emailKey && c.tenant.email ? "pointer" : "not-allowed",
                          opacity: sending ? 0.6 : 1,
                        }}
                      >
                        {sending ? "Envoi…" : emailKey ? (
                          <>
                            <Send style={{ width: 10, height: 10 }} />
                            {sentAtThisStage ? "Renvoyer" : "Envoyer"}
                          </>
                        ) : (
                          <>
                            <Mail style={{ width: 10, height: 10 }} />
                            Manuel
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
