import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Building as BuildingIcon,
  Banknote,
  TrendingUp,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  FileDown,
  Loader2,
} from "lucide-react";
import { listOwners, type Owner } from "../utils/storage";
import { buildOwnerPortfolio, ownerTenantRoster, type OwnerPortfolio } from "../utils/ownerMetrics";
import { tenantMonthStatus } from "../utils/rentStatus";
import { generateOwnerReportPdf } from "../lib/pdf";
import { getOrgRentSettings, getAccountingTransactions } from "../utils/storage";
import { useCurrency } from "../context/CurrencyContext";

/**
 * Owners view — portfolio summary per owner with 1-click quarterly /
 * yearly PDF report generation. Targets the 'send update to the
 * property owner' task that régies otherwise do by hand every quarter.
 */

export function OwnersView() {
  const { formatAmount } = useCurrency();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await listOwners();
        setOwners(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const portfolios = useMemo(
    () => owners.map((o) => buildOwnerPortfolio(o, year)),
    [owners, year],
  );

  const portfolioTotals = useMemo(() => {
    return portfolios.reduce(
      (acc, p) => ({
        buildings: acc.buildings + p.buildings.length,
        tenants: acc.tenants + p.activeTenantCount,
        units: acc.units + p.totalUnits,
        revenue: acc.revenue + p.revenueYtd,
        expenses: acc.expenses + p.expensesYtd,
        overdue: acc.overdue + p.overdueCount,
      }),
      { buildings: 0, tenants: 0, units: 0, revenue: 0, expenses: 0, overdue: 0 },
    );
  }, [portfolios]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = current; y >= current - 4; y--) years.push(y);
    return years;
  }, []);

  const handleGenerateReport = async (p: OwnerPortfolio) => {
    setGeneratingFor(p.owner.id);
    try {
      const settings = getOrgRentSettings();
      const now = new Date();
      const month = now.getMonth() + 1;
      const txs = getAccountingTransactions();
      const roster = ownerTenantRoster(p.owner, []);
      const tenantRows = roster.flatMap((r) =>
        r.tenants
          .filter((t) => t.status === "active")
          .map((t) => {
            const status = tenantMonthStatus(t, year, month, settings, txs).status;
            return {
              tenantName: t.name,
              buildingName: r.building.name,
              unit: t.unit,
              rentNet: Number(t.rentNet) || 0,
              charges: Number(t.charges) || 0,
              status,
            };
          }),
      );

      const { computeNetIncome } = await import("../utils/financialMetrics");
      const buildingRowsReal = p.buildings.map((b) => {
        const m = computeNetIncome({ buildingId: b.id, year });
        return {
          name: b.name,
          address: b.address,
          units: b.units ?? 0,
          occupiedUnits: b.occupiedUnits ?? 0,
          revenueYtd: m.revenue,
          expensesYtd: m.expenses,
          netIncomeYtd: m.netIncome,
        };
      });

      await generateOwnerReportPdf({
        ownerName: p.owner.name,
        ownerEmail: p.owner.email,
        ownerAddress: p.owner.address,
        year,
        generatedOn: new Date().toISOString(),
        portfolio: {
          buildingCount: p.buildings.length,
          tenantCount: p.activeTenantCount,
          totalUnits: p.totalUnits,
          occupiedUnits: p.occupiedUnits,
          occupancyRate: p.occupancyRate,
          revenueYtd: p.revenueYtd,
          expensesYtd: p.expensesYtd,
          netIncomeYtd: p.netIncomeYtd,
          netMarginYtd: p.netMarginYtd,
          nominalMonthlyRevenue: p.nominalMonthlyRevenue,
          overdueCount: p.overdueCount,
          overdueAmount: p.overdueAmount,
        },
        buildings: buildingRowsReal,
        tenants: tenantRows,
        currency: p.buildings[0]?.currency ?? "CHF",
      });
    } catch (err) {
      alert(`Erreur PDF: ${(err as Error).message}`);
    } finally {
      setGeneratingFor(null);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div style={{ textAlign: "center", padding: 48, color: "var(--muted-foreground)" }}>
          <Loader2 style={{ width: 24, height: 24, margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
          <p>Chargement des propriétaires…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
            Propriétaires
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Portefeuille, performance et rapports automatiques
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
            Année
          </label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--card)", color: "var(--foreground)", fontSize: 13, outline: "none",
            }}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {owners.length === 0 ? (
        <div style={{
          padding: "48px 32px", textAlign: "center",
          borderRadius: 14, border: "1px dashed var(--border)", background: "var(--card)",
          color: "var(--muted-foreground)",
        }}>
          <Users style={{ width: 32, height: 32, margin: "0 auto 8px", opacity: 0.6 }} />
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Aucun propriétaire</p>
          <p style={{ fontSize: 12, margin: "6px 0 0" }}>
            Les propriétaires sont associés aux immeubles via le champ <b>owner_id</b> (ajouté dans la fiche immeuble).
          </p>
        </div>
      ) : (
        <>
          {/* Global totals */}
          <div style={{
            marginBottom: 24,
            padding: "16px 20px",
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 16,
          }}>
            <TotalCell label={`${owners.length} propriétaire${owners.length > 1 ? "s" : ""}`} value={`${portfolioTotals.buildings} immeubles`} icon={BuildingIcon} />
            <TotalCell label={`${portfolioTotals.tenants} locataires actifs`} value={`${portfolioTotals.units} unités`} icon={Users} />
            <TotalCell label={`Recettes ${year}`} value={formatAmount(portfolioTotals.revenue)} icon={Banknote} accent="#16A34A" />
            <TotalCell label={`Résultat net ${year}`} value={formatAmount(portfolioTotals.revenue - portfolioTotals.expenses)} icon={TrendingUp} accent="#45553A" />
            {portfolioTotals.overdue > 0 && (
              <TotalCell label="Impayés actuels" value={`${portfolioTotals.overdue} cas`} icon={AlertTriangle} accent="#DC2626" />
            )}
          </div>

          {/* Owner cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {portfolios.map((p) => (
              <OwnerCard
                key={p.owner.id}
                portfolio={p}
                generating={generatingFor === p.owner.id}
                onGenerate={() => handleGenerateReport(p)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TotalCell({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: accent ? `color-mix(in srgb, ${accent} 12%, transparent)` : "var(--sidebar-accent)",
        color: accent ?? "var(--primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0, lineHeight: 1.2 }}>
          {value}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function OwnerCard({
  portfolio: p,
  generating,
  onGenerate,
}: {
  portfolio: OwnerPortfolio;
  generating: boolean;
  onGenerate: () => void;
}) {
  const { formatAmount } = useCurrency();
  const initials = p.owner.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{
      borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)",
      overflow: "hidden",
    }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "18px 22px",
        borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "var(--primary)", color: "var(--primary-foreground)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, flexShrink: 0, lineHeight: 1,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            {p.owner.name}
          </h3>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4, fontSize: 11, color: "var(--muted-foreground)" }}>
            {p.owner.email && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Mail style={{ width: 11, height: 11 }} />
                {p.owner.email}
              </span>
            )}
            {p.owner.phone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Phone style={{ width: 11, height: 11 }} />
                {p.owner.phone}
              </span>
            )}
            {p.owner.address && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin style={{ width: 11, height: 11 }} />
                {p.owner.address}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || p.buildings.length === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 10,
            background: generating || p.buildings.length === 0 ? "var(--border)" : "var(--primary)",
            color: generating || p.buildings.length === 0 ? "var(--muted-foreground)" : "var(--primary-foreground)",
            border: "none", fontSize: 12, fontWeight: 600,
            cursor: generating || p.buildings.length === 0 ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {generating ? (
            <>
              <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
              Génération…
            </>
          ) : (
            <>
              <FileDown style={{ width: 13, height: 13 }} />
              Rapport {p.year}
            </>
          )}
        </button>
      </div>

      {/* Metrics grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 0,
      }}>
        <MetricCell label="Immeubles" value={String(p.buildings.length)} />
        <MetricCell label="Unités occupées" value={`${p.occupiedUnits}/${p.totalUnits}`} sub={`${p.occupancyRate}%`} />
        <MetricCell label={`Recettes ${p.year}`} value={formatAmount(p.revenueYtd)} color={p.hasAccountingData ? "#16A34A" : "var(--muted-foreground)"} />
        <MetricCell label={`Charges ${p.year}`} value={formatAmount(p.expensesYtd)} color={p.hasAccountingData ? "#DC2626" : "var(--muted-foreground)"} />
        <MetricCell
          label="Résultat net"
          value={formatAmount(p.netIncomeYtd)}
          sub={`${p.netMarginYtd.toFixed(1)}% marge`}
          color={p.netIncomeYtd >= 0 ? "#45553A" : "#DC2626"}
          emphasis
        />
        {p.overdueCount > 0 && (
          <MetricCell
            label="Impayés ce mois"
            value={`${p.overdueCount}`}
            sub={formatAmount(p.overdueAmount)}
            color="#DC2626"
          />
        )}
      </div>

      {/* Buildings list */}
      {p.buildings.length > 0 ? (
        <div style={{ padding: "14px 22px 18px", borderTop: "1px solid var(--border)" }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
            textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px",
          }}>
            Immeubles du portefeuille
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {p.buildings.map((b) => (
              <span key={b.id} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 99,
                background: "var(--background)", border: "1px solid var(--border)",
                fontSize: 12, color: "var(--foreground)",
              }}>
                <BuildingIcon style={{ width: 11, height: 11, color: "var(--muted-foreground)" }} />
                {b.name}
                <span style={{ color: "var(--muted-foreground)" }}>
                  · {b.occupiedUnits}/{b.units}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          padding: "14px 22px", borderTop: "1px solid var(--border)",
          fontSize: 12, fontStyle: "italic", color: "var(--muted-foreground)",
        }}>
          Aucun immeuble associé. Assigne ce propriétaire dans la fiche d'un immeuble.
        </div>
      )}
    </div>
  );
}

function MetricCell({
  label, value, sub, color, emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  emphasis?: boolean;
}) {
  return (
    <div style={{
      padding: "14px 18px",
      borderRight: "1px solid var(--border)",
      minWidth: 0,
      background: emphasis ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "transparent",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)",
        textTransform: "uppercase", letterSpacing: "0.04em", margin: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 15, fontWeight: 700, color: color ?? "var(--foreground)",
        margin: "4px 0 0", lineHeight: 1.2,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
