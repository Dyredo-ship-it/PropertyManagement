import React, { useMemo, useState } from "react";
import { Calculator, Download, Plus, Trash2 } from "lucide-react";

/**
 * Swiss rent-increase calculator following the SVIT / HEV methodology
 * after value-adding renovations (travaux à plus-value). Inputs: cost
 * per work category, plus-value %, interest rate, depreciation years,
 * global subvention amount, number of rooms in the building.
 *
 * Output per category and in total:
 *  - Amount that counts as plus-value (coût × plus-value%)
 *  - Interest on capital (majorated reference rate)
 *  - Depreciation (linear over category's duration)
 *  - 1% SVIT / 1.5% HEV for work assimilated to plus-value
 *  - Annual + monthly increase per room
 *  - Increase per apartment based on its room count
 */

type Row = {
  id: string;
  label: string;
  cost: number;
  plusValuePct: number;
  depreciationYears: number;
};

const DEFAULT_ROWS: Row[] = [
  { id: "iso",   label: "Isolation",            cost: 0, plusValuePct: 100, depreciationYears: 30 },
  { id: "char",  label: "Charpente",            cost: 0, plusValuePct: 50,  depreciationYears: 50 },
  { id: "ech",   label: "Échafaudages",         cost: 0, plusValuePct: 50,  depreciationYears: 15 },
  { id: "mac",   label: "Maçonnerie",           cost: 0, plusValuePct: 60,  depreciationYears: 50 },
  { id: "gc",    label: "Gardes-corps",         cost: 0, plusValuePct: 60,  depreciationYears: 50 },
  { id: "arch",  label: "Architecte",           cost: 0, plusValuePct: 20,  depreciationYears: 5  },
  { id: "stores",label: "Stores",               cost: 0, plusValuePct: 60,  depreciationYears: 15 },
  { id: "local", label: "Local supplémentaire", cost: 0, plusValuePct: 70,  depreciationYears: 30 },
  { id: "porte", label: "Porte d'entrée",       cost: 0, plusValuePct: 70,  depreciationYears: 30 },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function RentIncreaseCalculator() {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [subventions, setSubventions] = useState<number>(0);
  const [rateRef, setRateRef] = useState<number>(1.25);     // taux hypothécaire de référence, %
  const [rateBump, setRateBump] = useState<number>(2.25);   // majoration, %
  const [totalRooms, setTotalRooms] = useState<number>(30);
  const [apartments, setApartments] = useState<{ id: string; label: string; rooms: number }[]>([
    { id: "a1", label: "1er — 4.5p", rooms: 4.5 },
    { id: "a2", label: "1er — 3.5p", rooms: 3.5 },
    { id: "a3", label: "1er — 2p",   rooms: 2   },
  ]);

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const interestRate = (rateRef + rateBump) / 100;

  const computed = useMemo(() => {
    return rows.map((r) => {
      // Subvention allocated proportionally to this row's share of total cost.
      const subShare = totalCost > 0 ? (r.cost / totalCost) * subventions : 0;
      const netCost = r.cost - subShare;
      const plusValue = netCost * (r.plusValuePct / 100);
      const nonPlusValue = netCost - plusValue;
      const interestAnnual = (plusValue / 2) * interestRate;
      const amortAnnual = r.depreciationYears > 0 ? plusValue / r.depreciationYears : 0;
      const svit15 = nonPlusValue * 0.01;   // 1% SVIT
      const hev15  = nonPlusValue * 0.015;  // 1.5% HEV
      return {
        ...r, subShare, netCost, plusValue, nonPlusValue,
        interestAnnual, amortAnnual, svit15, hev15,
        annualSvit: interestAnnual + amortAnnual + svit15,
        annualHev:  interestAnnual + amortAnnual + hev15,
      };
    });
  }, [rows, totalCost, subventions, interestRate]);

  const totals = useMemo(() => {
    const sum = computed.reduce(
      (acc, c) => ({
        cost:        acc.cost        + c.cost,
        plusValue:   acc.plusValue   + c.plusValue,
        interest:    acc.interest    + c.interestAnnual,
        amort:       acc.amort       + c.amortAnnual,
        svit15:      acc.svit15      + c.svit15,
        hev15:       acc.hev15       + c.hev15,
        annualSvit:  acc.annualSvit  + c.annualSvit,
        annualHev:   acc.annualHev   + c.annualHev,
      }),
      { cost: 0, plusValue: 0, interest: 0, amort: 0, svit15: 0, hev15: 0, annualSvit: 0, annualHev: 0 },
    );
    const monthlyPerRoomSvit = totalRooms > 0 ? sum.annualSvit / totalRooms / 12 : 0;
    const monthlyPerRoomHev  = totalRooms > 0 ? sum.annualHev  / totalRooms / 12 : 0;
    const returnOnInvest = totalCost > 0 ? (sum.annualSvit / totalCost) * 100 : 0;
    return { ...sum, monthlyPerRoomSvit, monthlyPerRoomHev, returnOnInvest };
  }, [computed, totalRooms, totalCost]);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: `c${Date.now()}`, label: "Nouvelle catégorie", cost: 0, plusValuePct: 50, depreciationYears: 30 }]);
  };
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const addApt = () => setApartments((p) => [...p, { id: `apt${Date.now()}`, label: "Appartement", rooms: 3 }]);
  const removeApt = (id: string) => setApartments((p) => p.filter((a) => a.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
          color: "var(--primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Calculator style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
            Calculateur d'augmentation de loyer
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
            Méthodes SVIT & HEV après travaux à plus-value
          </p>
        </div>
      </div>

      {/* ── Global inputs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Field label="Subventions (CHF)">
          <NumInput value={subventions} onChange={setSubventions} />
        </Field>
        <Field label="Taux de référence (%)">
          <NumInput value={rateRef} onChange={setRateRef} step={0.25} />
        </Field>
        <Field label="Majoration (%)">
          <NumInput value={rateBump} onChange={setRateBump} step={0.25} />
        </Field>
        <Field label="Nombre de pièces total">
          <NumInput value={totalRooms} onChange={setTotalRooms} step={0.5} />
        </Field>
      </div>

      {/* ── Categories table ── */}
      <div style={cardStyle}>
        <div style={cardHeader}>
          <span>Travaux par catégorie</span>
          <button onClick={addRow} style={smallBtn}><Plus style={{ width: 12, height: 12 }} /> Ajouter</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
            <thead>
              <tr style={{ background: "var(--background)", textAlign: "left" }}>
                <th style={th}>Catégorie</th>
                <th style={th}>Coût (CHF)</th>
                <th style={th}>Plus-value (%)</th>
                <th style={th}>Dépréciation (ans)</th>
                <th style={thRight}>Part plus-value</th>
                <th style={thRight}>Intérêt</th>
                <th style={thRight}>Amort.</th>
                <th style={thRight}>Annuel SVIT</th>
                <th style={thRight}>Annuel HEV</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {computed.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>
                    <input
                      value={r.label}
                      onChange={(e) => updateRow(r.id, { label: e.target.value })}
                      style={{ ...inlineInput, minWidth: 140 }}
                    />
                  </td>
                  <td style={td}><NumInput value={r.cost} onChange={(v) => updateRow(r.id, { cost: v })} /></td>
                  <td style={td}><NumInput value={r.plusValuePct} onChange={(v) => updateRow(r.id, { plusValuePct: v })} step={5} /></td>
                  <td style={td}><NumInput value={r.depreciationYears} onChange={(v) => updateRow(r.id, { depreciationYears: v })} step={5} /></td>
                  <td style={tdRight}>{fmt(r.plusValue)}</td>
                  <td style={tdRight}>{fmt(r.interestAnnual)}</td>
                  <td style={tdRight}>{fmt(r.amortAnnual)}</td>
                  <td style={{ ...tdRight, fontWeight: 600 }}>{fmt(r.annualSvit)}</td>
                  <td style={{ ...tdRight, fontWeight: 600 }}>{fmt(r.annualHev)}</td>
                  <td style={td}>
                    <button onClick={() => removeRow(r.id)} style={iconBtn} title="Supprimer">
                      <Trash2 style={{ width: 12, height: 12, color: "#DC2626" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", background: "var(--background)" }}>
                <td style={{ ...td, fontWeight: 700 }}>TOTAL</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(totals.cost)}</td>
                <td style={td}></td>
                <td style={td}></td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(totals.plusValue)}</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(totals.interest)}</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(totals.amort)}</td>
                <td style={{ ...tdRight, fontWeight: 700, color: "var(--primary)" }}>{fmt(totals.annualSvit)}</td>
                <td style={{ ...tdRight, fontWeight: 700, color: "var(--primary)" }}>{fmt(totals.annualHev)}</td>
                <td style={td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Results summary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <KpiCard label="Augmentation mensuelle / pièce (SVIT)" value={`CHF ${fmt(totals.monthlyPerRoomSvit)}`} />
        <KpiCard label="Augmentation mensuelle / pièce (HEV)"  value={`CHF ${fmt(totals.monthlyPerRoomHev)}`} highlight />
        <KpiCard label="Rendement sur coût des travaux" value={`${totals.returnOnInvest.toFixed(2)} %`} />
      </div>

      {/* ── Per-apartment breakdown ── */}
      <div style={cardStyle}>
        <div style={cardHeader}>
          <span>Augmentation par appartement</span>
          <button onClick={addApt} style={smallBtn}><Plus style={{ width: 12, height: 12 }} /> Ajouter</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
            <thead>
              <tr style={{ background: "var(--background)", textAlign: "left" }}>
                <th style={th}>Appartement</th>
                <th style={th}>Pièces</th>
                <th style={thRight}>Augmentation mensuelle SVIT</th>
                <th style={thRight}>Augmentation mensuelle HEV</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {apartments.map((a) => {
                const svit = a.rooms * totals.monthlyPerRoomSvit;
                const hev  = a.rooms * totals.monthlyPerRoomHev;
                return (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={td}>
                      <input
                        value={a.label}
                        onChange={(e) => setApartments((p) => p.map((x) => x.id === a.id ? { ...x, label: e.target.value } : x))}
                        style={{ ...inlineInput, minWidth: 120 }}
                      />
                    </td>
                    <td style={td}>
                      <NumInput value={a.rooms} onChange={(v) => setApartments((p) => p.map((x) => x.id === a.id ? { ...x, rooms: v } : x))} step={0.5} />
                    </td>
                    <td style={{ ...tdRight, fontWeight: 600 }}>CHF {fmt(svit)}</td>
                    <td style={{ ...tdRight, fontWeight: 600, color: "var(--primary)" }}>CHF {fmt(hev)}</td>
                    <td style={td}>
                      <button onClick={() => removeApt(a.id)} style={iconBtn} title="Supprimer">
                        <Trash2 style={{ width: 12, height: 12, color: "#DC2626" }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Print hint ── */}
      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "var(--background)", border: "1px dashed var(--border)",
        fontSize: 11, color: "var(--muted-foreground)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Download style={{ width: 13, height: 13 }} />
        Astuce : Cmd/Ctrl+P pour exporter cette page en PDF et l'envoyer avec les avis d'augmentation officiels.
      </div>
    </div>
  );
}

/* ─── UI helpers ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)" }}>{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
      style={{
        width: "100%", padding: "7px 10px", borderRadius: 8,
        border: "1px solid var(--border)", background: "var(--card)",
        color: "var(--foreground)", fontSize: 12, outline: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    />
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12,
      background: highlight ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--card)",
      border: `1px solid ${highlight ? "color-mix(in srgb, var(--primary) 22%, transparent)" : "var(--border)"}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginTop: 4, letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)",
  overflow: "hidden",
};
const cardHeader: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "12px 16px", borderBottom: "1px solid var(--border)",
  fontSize: 13, fontWeight: 600, color: "var(--foreground)",
};
const smallBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8,
  background: "var(--background)", border: "1px solid var(--border)",
  fontSize: 11, fontWeight: 600, color: "var(--foreground)", cursor: "pointer",
};
const th: React.CSSProperties = { padding: "10px 12px", fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" };
const thRight: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "8px 12px", verticalAlign: "middle" };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const inlineInput: React.CSSProperties = {
  padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--card)", color: "var(--foreground)", fontSize: 12, outline: "none", width: "100%",
};
const iconBtn: React.CSSProperties = {
  padding: 4, borderRadius: 6, border: "1px solid var(--border)", background: "transparent",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
