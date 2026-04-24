import React, { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  buildUnmatchedRows,
  acceptMatch,
  acceptAllConfident,
  type MatchCandidate,
  type UnmatchedRow,
} from "../utils/bankReconciliation";
import { useCurrency } from "../context/CurrencyContext";

/**
 * Smart bank reconciliation panel — renders incoming rent payments that
 * haven't been linked to a tenant yet, along with ranked match
 * suggestions. Batch-accept for confident matches (>= 70 pts), manual
 * pick for the rest.
 */

export function BankReconciliationPanel({
  buildingId,
  year,
  onChanged,
}: {
  buildingId?: string;
  year?: number;
  onChanged: () => void;
}) {
  const { formatAmount } = useCurrency();
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(
    () => buildUnmatchedRows({ buildingId, year }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildingId, year, tick],
  );

  if (rows.length === 0) return null;

  const confidentCount = rows.filter((r) => r.confident).length;

  const refresh = () => {
    setTick((t) => t + 1);
    onChanged();
  };

  const handleAcceptRow = (row: UnmatchedRow, candidate: MatchCandidate) => {
    acceptMatch(row.tx.id, candidate.tenant);
    refresh();
  };

  const handleAcceptAll = () => {
    const n = acceptAllConfident({ buildingId, year });
    if (n > 0) refresh();
  };

  return (
    <div
      style={{
        marginBottom: 20,
        borderRadius: 14,
        border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
        background: "color-mix(in srgb, var(--primary) 3%, var(--card))",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "color-mix(in srgb, var(--primary) 15%, transparent)",
            color: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles style={{ width: 16, height: 16 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", margin: 0 }}>
              {rows.length} paiement{rows.length > 1 ? "s" : ""} à rapprocher
            </p>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              {confidentCount > 0
                ? `${confidentCount} match${confidentCount > 1 ? "s" : ""} automatique${confidentCount > 1 ? "s" : ""} identifié${confidentCount > 1 ? "s" : ""}`
                : "Pas de match évident — à vérifier manuellement"}
            </p>
          </div>
        </div>
        {confidentCount > 0 && (
          <button
            type="button"
            onClick={handleAcceptAll}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9,
              border: "none", cursor: "pointer",
              background: "var(--primary)", color: "var(--primary-foreground)",
              fontSize: 12, fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <CheckCircle2 style={{ width: 13, height: 13 }} />
            Accepter les {confidentCount} match{confidentCount > 1 ? "s" : ""} automatique{confidentCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.slice(0, 12).map((row) => {
          const isOpen = expanded === row.tx.id;
          return (
            <div
              key={row.tx.id}
              style={{
                borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                padding: "12px 18px",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              }}>
                {/* Tx summary */}
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {row.tx.description || "(sans description)"}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                    {row.tx.datePayment || row.tx.dateInvoice} · Compte {row.tx.accountNumber}
                  </p>
                </div>

                {/* Amount */}
                <span style={{
                  fontSize: 14, fontWeight: 700, color: "#16A34A",
                  fontVariantNumeric: "tabular-nums", flexShrink: 0,
                }}>
                  {formatAmount(row.tx.credit)}
                </span>

                {/* Top candidate action */}
                {row.top ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{
                        fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0,
                      }}>
                        → {row.top.tenant.name}
                      </p>
                      <p style={{ fontSize: 10, color: row.confident ? "#16A34A" : "#B45309", margin: "2px 0 0", fontWeight: 600 }}>
                        {row.confident ? "✓ Match confiant" : "À vérifier"} · {row.top.score} pts
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAcceptRow(row, row.top!)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        border: "none", cursor: "pointer",
                        background: row.confident ? "var(--primary)" : "var(--card)",
                        color: row.confident ? "var(--primary-foreground)" : "var(--foreground)",
                        borderWidth: row.confident ? 0 : 1,
                        borderStyle: "solid",
                        borderColor: "var(--border)",
                      }}
                    >
                      Accepter
                    </button>
                    {row.candidates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : row.tx.id)}
                        title={isOpen ? "Réduire" : "Voir les autres propositions"}
                        style={{
                          width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)",
                          background: "var(--card)", color: "var(--muted-foreground)",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {isOpen ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={{
                    fontSize: 11, fontStyle: "italic", color: "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <AlertCircle style={{ width: 11, height: 11 }} />
                    Aucun locataire correspondant
                  </span>
                )}
              </div>

              {/* Reasons + alternative candidates (expanded) */}
              {row.top && (
                <div style={{ marginTop: 6, marginLeft: 2 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {row.top.reasons.map((r, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        color: "var(--primary)",
                      }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isOpen && row.candidates.length > 1 && (
                <div style={{
                  marginTop: 10, padding: "8px 10px", borderRadius: 8,
                  background: "var(--background)",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Autres propositions
                  </p>
                  {row.candidates.slice(1).map((c) => (
                    <div key={c.tenant.id} style={{
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                          {c.tenant.name}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "1px 0 0" }}>
                          {c.reasons.join(" · ")}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)" }}>
                        {c.score} pts
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAcceptRow(row, c)}
                        style={{
                          padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                          border: "1px solid var(--border)", cursor: "pointer",
                          background: "var(--card)", color: "var(--foreground)",
                        }}
                      >
                        Utiliser
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {rows.length > 12 && (
          <div style={{
            padding: "10px 18px", fontSize: 11, textAlign: "center",
            color: "var(--muted-foreground)",
            borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}>
            +{rows.length - 12} autres paiements — scroll la liste des transactions pour les voir
          </div>
        )}
      </div>
    </div>
  );
}
