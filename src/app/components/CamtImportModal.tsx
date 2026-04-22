import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, CheckCircle, Wallet } from "lucide-react";
import { parseCamt054, type CamtParseResult, type CamtTransaction } from "../lib/camt054";
import {
  findRentInvoicesByReferences,
  markRentInvoicePaid,
  type RentInvoice,
} from "../lib/rentInvoices";
import {
  getTenants,
  getBuildings,
  addAccountingTransactions,
  type AccountingTransaction,
} from "../utils/storage";

interface CamtImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported?: (summary: { matched: number; skipped: number }) => void;
}

interface Row {
  tx: CamtTransaction;
  invoice?: RentInvoice | null;
  tenantName?: string;
  buildingName?: string;
  selected: boolean;
  applied?: "ok" | "already-paid" | "error";
  errorMsg?: string;
}

export function CamtImportModal({ open, onClose, onImported }: CamtImportModalProps) {
  const [parsed, setParsed] = useState<CamtParseResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [summary, setSummary] = useState<{ matched: number; skipped: number } | null>(null);

  const reset = () => {
    setParsed(null);
    setRows([]);
    setError(null);
    setSummary(null);
  };

  const handleFile = async (file: File) => {
    reset();
    setLoading(true);
    try {
      const text = await file.text();
      const result = parseCamt054(text);
      const references = result.transactions
        .map((t) => t.reference)
        .filter((r): r is string => !!r);

      let invoicesByRef = new Map<string, RentInvoice>();
      if (references.length > 0) {
        try {
          const invoices = await findRentInvoicesByReferences(references);
          invoicesByRef = new Map(invoices.map((i) => [i.reference, i]));
        } catch {
          /* ignore DB lookup error — rows will simply show as unmatched */
        }
      }

      const tenants = getTenants();
      const buildings = getBuildings();

      const mapped: Row[] = result.transactions
        .filter((t) => t.direction === "credit")
        .map((tx) => {
          const inv = tx.reference ? invoicesByRef.get(tx.reference) ?? null : null;
          const tenant = inv?.tenantId ? tenants.find((t) => t.id === inv.tenantId) : undefined;
          const building = inv?.buildingId ? buildings.find((b) => b.id === inv.buildingId) : undefined;
          return {
            tx,
            invoice: inv,
            tenantName: tenant?.name,
            buildingName: building?.name,
            selected: !!inv && inv.status !== "paid",
          };
        });

      setParsed(result);
      setRows(mapped);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const matchedCount = rows.filter((r) => !!r.invoice).length;
  const unmatchedCount = rows.length - matchedCount;
  const selectedCount = rows.filter((r) => r.selected && r.invoice).length;

  const handleApply = async () => {
    const toApply = rows.filter((r) => r.selected && r.invoice);
    if (toApply.length === 0) return;
    setApplying(true);
    setError(null);

    const nextRows = [...rows];
    const newTxs: Omit<AccountingTransaction, "id">[] = [];
    let okCount = 0;

    for (let i = 0; i < nextRows.length; i++) {
      const r = nextRows[i];
      if (!r.selected || !r.invoice) continue;
      try {
        if (r.invoice.status === "paid") {
          nextRows[i] = { ...r, applied: "already-paid" };
          continue;
        }
        await markRentInvoicePaid({
          id: r.invoice.id,
          paidAmount: r.tx.amount,
          paidAt: r.tx.valueDate,
          camtTxId: r.tx.txId,
        });

        // Mirror the payment in the accounting ledger as a 101 credit on
        // the building, dated at the bank's value date.
        if (r.invoice.buildingId) {
          newTxs.push({
            buildingId: r.invoice.buildingId,
            accountNumber: 101,
            category: "Encaissements loyers",
            description: `Loyer ${r.invoice.month} — ${r.tenantName ?? ""} (CAMT)`.trim(),
            unit: "",
            dateInvoice: r.tx.valueDate,
            datePayment: r.tx.valueDate,
            month: r.invoice.month,
            debit: 0,
            credit: r.tx.amount,
            status: "paid",
            tenantName: r.tenantName,
          });
        }

        nextRows[i] = { ...r, applied: "ok" };
        okCount++;
      } catch (err) {
        nextRows[i] = { ...r, applied: "error", errorMsg: (err as Error).message };
      }
    }

    if (newTxs.length > 0) {
      try {
        addAccountingTransactions(newTxs);
      } catch (err) {
        // Unexpected — the invoices are already marked paid, keep going.
        setError(`Paiements enregistrés, mais certaines transactions comptables n'ont pas pu être créées: ${(err as Error).message}`);
      }
    }

    setRows(nextRows);
    setSummary({ matched: okCount, skipped: toApply.length - okCount });
    setApplying(false);
    onImported?.({ matched: okCount, skipped: toApply.length - okCount });
  };

  const toggleRow = (idx: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));
  };

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--card)", color: "var(--foreground)", borderRadius: 16,
        width: "96vw", maxWidth: 780, maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Importer paiements bancaires (CAMT.054)</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              Téléchargez le fichier XML exporté depuis votre e-banking suisse.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {!parsed && !loading && (
            <label
              style={{
                display: "block", padding: 24, border: "2px dashed var(--border)",
                borderRadius: 12, background: "var(--background)", cursor: "pointer",
                textAlign: "center",
              }}
            >
              <Upload size={28} style={{ margin: "0 auto 8px", color: "var(--primary)" }} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Cliquez ou glissez-déposez votre fichier CAMT.054 (.xml)
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Seuls les paiements <strong>reçus</strong> avec une QR-référence sont rapprochés automatiquement.
              </div>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                style={{ display: "none" }}
              />
            </label>
          )}

          {loading && (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: 12 }}>
              Analyse en cours…
            </div>
          )}

          {error && (
            <div style={{
              padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.10)",
              color: "#DC2626", fontSize: 12, marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          {parsed && !loading && (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14,
              }}>
                <Stat label="Crédits reçus" value={String(rows.length)} />
                <Stat label="Rapprochés" value={String(matchedCount)} color="#16a34a" />
                <Stat label="Sans correspondance" value={String(unmatchedCount)} color="#B45309" />
              </div>

              <div style={{
                border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden",
                background: "var(--background)",
              }}>
                {rows.map((r, idx) => (
                  <div
                    key={`${r.tx.txId}-${idx}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px",
                      borderBottom: idx < rows.length - 1 ? "1px solid var(--border)" : "none",
                      opacity: r.applied === "ok" ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!r.selected}
                      onChange={() => toggleRow(idx)}
                      disabled={!r.invoice || r.applied === "ok" || applying}
                      style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {r.tx.currency} {r.tx.amount.toFixed(2)}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          {r.tx.valueDate}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                        {r.tx.debtorName ?? "Payeur inconnu"}
                        {r.tx.reference && <> · <span style={{ fontFamily: "monospace" }}>{r.tx.reference}</span></>}
                      </div>
                      {r.invoice && (
                        <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>
                          ✓ {r.tenantName ?? "Locataire inconnu"} · {r.buildingName ?? "?"} · Loyer {r.invoice.month}
                          {r.invoice.status === "paid" && " (déjà marquée payée)"}
                          {r.tx.amount !== r.invoice.amount && (
                            <> · <span style={{ color: "#B45309" }}>Montant différent ({r.invoice.currency} {r.invoice.amount.toFixed(2)} attendu)</span></>
                          )}
                        </div>
                      )}
                      {!r.invoice && (
                        <div style={{ fontSize: 11, color: "#B45309", marginTop: 4 }}>
                          Aucune quittance Palier ne correspond à cette référence.
                        </div>
                      )}
                      {r.applied === "ok" && (
                        <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={12} /> Appliquée
                        </div>
                      )}
                      {r.applied === "error" && (
                        <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>
                          Erreur: {r.errorMsg ?? "inconnue"}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {summary && (
                <div style={{
                  marginTop: 14, padding: 12, borderRadius: 10,
                  background: "rgba(22,163,74,0.10)", color: "#166534",
                  display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                }}>
                  <CheckCircle size={16} />
                  {summary.matched} paiement{summary.matched > 1 ? "s" : ""} rapproché{summary.matched > 1 ? "s" : ""} et enregistré{summary.matched > 1 ? "s" : ""} en comptabilité.
                  {summary.skipped > 0 && <> · {summary.skipped} en erreur.</>}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{
          padding: "12px 22px", borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center",
        }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            {parsed && `Fichier: ${parsed.messageId ?? "—"} · ${parsed.accountIban ?? ""}`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {parsed && (
              <button
                onClick={reset}
                disabled={applying}
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: "1px solid var(--border)", background: "var(--card)",
                  color: "var(--foreground)", cursor: applying ? "not-allowed" : "pointer",
                }}
              >
                Autre fichier
              </button>
            )}
            <button
              onClick={onClose}
              disabled={applying}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: "1px solid var(--border)", background: "var(--card)",
                color: "var(--foreground)", cursor: applying ? "not-allowed" : "pointer",
              }}
            >
              Fermer
            </button>
            {parsed && selectedCount > 0 && !summary && (
              <button
                onClick={handleApply}
                disabled={applying || selectedCount === 0}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: "none", background: "var(--primary)", color: "var(--primary-foreground)",
                  cursor: applying ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: applying ? 0.7 : 1,
                }}
              >
                <Wallet size={14} />
                {applying ? "Application…" : `Appliquer ${selectedCount} paiement${selectedCount > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 10,
      border: "1px solid var(--border)", background: "var(--background)",
    }}>
      <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "var(--foreground)", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
