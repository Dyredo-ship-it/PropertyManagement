import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Building,
  Banknote,
  Users,
  Wrench,
  ChevronDown,
} from "lucide-react";
import { getBuildings, type Building as BuildingType } from "../utils/storage";
import {
  buildMonthlyMetrics,
  buildMonthlyOccupancy,
  resolveTimeFrame,
  shiftMonth,
  earliestTransactionMonth,
  formatDeltaPct,
  type TimeFrameKey,
  type MonthlyPoint,
} from "../utils/financialMetrics";
import { useLanguage } from "../i18n/LanguageContext";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatCHF = (v: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v)}`;

/* ─── Styled native <select> ───────────────────────────────── */

function Selector<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        aria-label={ariaLabel}
        value={value as any}
        onChange={(e) => {
          const raw = e.target.value;
          const matched = options.find((o) => String(o.value) === raw);
          if (matched) onChange(matched.value);
        }}
        style={{
          appearance: "none",
          padding: "7px 30px 7px 12px",
          borderRadius: 9,
          border: "1px solid var(--border)",
          background: "var(--background)",
          color: "var(--foreground)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 12,
          height: 12,
          color: "var(--muted-foreground)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ─── KPI Card ────────────────────────────────────────────── */

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendUp,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean | null;
}) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--card)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--sidebar-accent)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
        </div>
        {trend && (
          <span
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: trendUp === null
                ? "color-mix(in srgb, var(--muted-foreground) 10%, transparent)"
                : trendUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: trendUp === null
                ? "var(--muted-foreground)"
                : trendUp ? "#16A34A" : "#DC2626",
            }}
          >
            {trendUp === null ? null : trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <p
        className="text-[11px] font-medium uppercase"
        style={{ color: "var(--muted-foreground)", letterSpacing: "0.05em" }}
      >
        {label}
      </p>
      <p className="text-[22px] font-bold leading-tight mt-0.5" style={{ color: "var(--foreground)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─── Chart Card wrapper ──────────────────────────────────── */

function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--card)",
        padding: "24px 20px 16px",
      }}
    >
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, valueFormatter, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>
        {label}
      </p>
      {payload.map((entry: any) => (
        <p
          key={entry.name}
          className="text-[11px]"
          style={{ color: entry.color }}
        >
          {entry.name}: {valueFormatter
            ? valueFormatter(entry.value)
            : suffix === "%" ? `${entry.value}%` : formatCHF(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN ANALYTICS DASHBOARD
═══════════════════════════════════════════════════════════════ */

type YoYPoint = MonthlyPoint & {
  revenuePrior?: number;
  expensesPrior?: number;
  netIncomePrior?: number;
  occupancy?: number;
  occupancyPrior?: number;
};

export function AnalyticsDashboard() {
  useLanguage();
  const [buildings, setBuildings] = useState<BuildingType[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeFrameKey>("last-12");
  const [yearChoice, setYearChoice] = useState<number>(new Date().getFullYear());
  const [yoyEnabled, setYoyEnabled] = useState<boolean>(false);

  const [comparisonMonth, setComparisonMonth] = useState<number>(new Date().getMonth());
  const [comparisonYear, setComparisonYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setBuildings(getBuildings());
  }, []);

  const scopeId = selectedBuildingId ?? undefined;

  const range = useMemo(() => {
    const earliest = earliestTransactionMonth(scopeId);
    return resolveTimeFrame(timeframe, new Date(), { year: yearChoice, earliestMonth: earliest });
  }, [timeframe, yearChoice, scopeId]);

  // Current + prior-year series (merged by month position for the chart X axis).
  const series = useMemo<YoYPoint[]>(() => {
    const cur = buildMonthlyMetrics({ buildingId: scopeId, startYearMonth: range.start, endYearMonth: range.end });
    const priorStart = shiftMonth(range.start, -12);
    const priorEnd = shiftMonth(range.end, -12);
    const prior = buildMonthlyMetrics({ buildingId: scopeId, startYearMonth: priorStart, endYearMonth: priorEnd });
    const occCur = buildMonthlyOccupancy({ buildingId: scopeId, startYearMonth: range.start, endYearMonth: range.end });
    const occPrior = buildMonthlyOccupancy({ buildingId: scopeId, startYearMonth: priorStart, endYearMonth: priorEnd });
    const occCurMap = new Map(occCur.map((p) => [p.month, p.occupancy]));
    const occPriorMap = new Map(occPrior.map((p) => [p.month, p.occupancy]));
    return cur.points.map((p, i) => ({
      ...p,
      occupancy: occCurMap.get(p.month) ?? 0,
      revenuePrior: prior.points[i]?.revenue,
      expensesPrior: prior.points[i]?.expenses,
      netIncomePrior: prior.points[i]?.netIncome,
      occupancyPrior: occPriorMap.get(prior.points[i]?.month ?? "") ?? undefined,
    }));
  }, [scopeId, range.start, range.end]);

  const totals = useMemo(() => {
    const acc = { revenue: 0, expenses: 0, netIncome: 0, revenuePrior: 0, expensesPrior: 0, netIncomePrior: 0 };
    for (const p of series) {
      acc.revenue += p.revenue;
      acc.expenses += p.expenses;
      acc.netIncome += p.netIncome;
      acc.revenuePrior += p.revenuePrior ?? 0;
      acc.expensesPrior += p.expensesPrior ?? 0;
      acc.netIncomePrior += p.netIncomePrior ?? 0;
    }
    return acc;
  }, [series]);

  const revenueDelta = formatDeltaPct(totals.revenue, totals.revenuePrior);
  const costsDelta = formatDeltaPct(totals.expenses, totals.expensesPrior);
  const netDelta = formatDeltaPct(totals.netIncome, totals.netIncomePrior);

  // Average occupancy across the current range.
  const avgOccupancy = series.length > 0
    ? Math.round(series.reduce((s, p) => s + (p.occupancy ?? 0), 0) / series.length)
    : 0;
  const avgOccupancyPrior = series.length > 0
    ? Math.round(series.reduce((s, p) => s + (p.occupancyPrior ?? 0), 0) / series.length)
    : 0;
  const occupancyDelta = formatDeltaPct(avgOccupancy, avgOccupancyPrior);
  const occupancyDeltaText = avgOccupancyPrior
    ? `${avgOccupancy - avgOccupancyPrior >= 0 ? "+" : ""}${(avgOccupancy - avgOccupancyPrior).toFixed(0)} pts`
    : "—";

  const totalUnits = scopeId
    ? (buildings.find((b) => b.id === scopeId)?.units ?? 0)
    : buildings.reduce((s, b) => s + (b.units ?? 0), 0);

  // X-axis label: "Mar '26" so YoY overlay of prior year is still readable.
  const chartData = series.map((p) => ({
    ...p,
    xLabel: `${p.monthLabel} '${String(p.year).slice(-2)}`,
  }));

  const hasAnyData = useMemo(
    () => series.some((p) => p.revenue !== 0 || p.expenses !== 0),
    [series],
  );

  /* ─── Building comparison (single month) ─────────────────── */

  const comparisonSeries = useMemo(() => {
    const ym = `${comparisonYear}-${String(comparisonMonth + 1).padStart(2, "0")}`;
    const yearsBack = shiftMonth(ym, -12);
    return buildings.map((b) => {
      const cur = buildMonthlyMetrics({ buildingId: b.id, startYearMonth: ym, endYearMonth: ym });
      const prior = buildMonthlyMetrics({ buildingId: b.id, startYearMonth: yearsBack, endYearMonth: yearsBack });
      return {
        name: b.name.length > 16 ? b.name.slice(0, 16) + "…" : b.name,
        fullName: b.name,
        revenue: cur.points[0]?.revenue ?? 0,
        costs: cur.points[0]?.expenses ?? 0,
        netIncome: cur.points[0]?.netIncome ?? 0,
        revenuePrior: prior.points[0]?.revenue ?? 0,
        costsPrior: prior.points[0]?.expenses ?? 0,
        netIncomePrior: prior.points[0]?.netIncome ?? 0,
        units: b.units ?? 0,
        occupiedUnits: b.occupiedUnits ?? 0,
      };
    });
  }, [buildings, comparisonMonth, comparisonYear]);

  /* ─── UI controls ─────────────────────────────────────────── */

  const tfOptions: { value: TimeFrameKey; label: string }[] = [
    { value: "last-6", label: "6 derniers mois" },
    { value: "last-12", label: "12 derniers mois" },
    { value: "ytd", label: `YTD ${new Date().getFullYear()}` },
    { value: "year", label: `Année ${yearChoice}` },
    { value: "all", label: "Tout l'historique" },
  ];

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: { value: number; label: string }[] = [];
    for (let y = current; y >= current - 5; y--) years.push({ value: y, label: String(y) });
    return years;
  }, []);

  const buildingOptions: { value: string; label: string }[] = [
    { value: "__all__", label: "Tous les immeubles" },
    ...buildings.map((b) => ({ value: b.id, label: b.name })),
  ];

  const comparisonYearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years: { value: number; label: string }[] = [];
    for (let y = current; y >= current - 5; y--) years.push({ value: y, label: String(y) });
    return years;
  }, []);

  return (
    <div className="page-shell">
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="text-[22px] font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
          Analytics
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          Basé sur vos écritures comptables réelles
        </p>
      </div>

      {/* ── Global controls ────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          marginBottom: 24,
        }}
      >
        <Selector<string>
          value={selectedBuildingId ?? "__all__"}
          onChange={(v) => setSelectedBuildingId(v === "__all__" ? null : v)}
          options={buildingOptions}
          ariaLabel="Bâtiment"
        />
        <Selector<TimeFrameKey>
          value={timeframe}
          onChange={setTimeframe}
          options={tfOptions}
          ariaLabel="Plage temporelle"
        />
        {timeframe === "year" && (
          <Selector<number>
            value={yearChoice}
            onChange={setYearChoice}
            options={yearOptions}
            ariaLabel="Année"
          />
        )}
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          marginLeft: "auto", fontSize: 13, color: "var(--foreground)", cursor: "pointer",
          padding: "6px 12px", borderRadius: 9,
          background: yoyEnabled ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--background)",
          border: "1px solid var(--border)",
          userSelect: "none",
        }}>
          <input
            type="checkbox"
            checked={yoyEnabled}
            onChange={(e) => setYoyEnabled(e.target.checked)}
            style={{ margin: 0 }}
          />
          Comparer avec l'année précédente
        </label>
      </div>

      {!hasAnyData && (
        <div
          style={{
            padding: "16px 20px", borderRadius: 12, border: "1px dashed var(--border)",
            background: "var(--card)", color: "var(--muted-foreground)",
            fontSize: 13, marginBottom: 24,
          }}
        >
          Aucune écriture comptable trouvée pour cette période. Les graphiques s'alimentent à partir de l'onglet <b>Comptabilité</b>.
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
        <KpiCard
          icon={Banknote}
          label="Recettes"
          value={formatCHF(totals.revenue)}
          sub={`vs ${formatCHF(totals.revenuePrior)} (an -1)`}
          trend={revenueDelta.text}
          trendUp={revenueDelta.up}
        />
        <KpiCard
          icon={Users}
          label="Taux d'occupation"
          value={`${avgOccupancy}%`}
          sub={`${totalUnits} unités`}
          trend={occupancyDeltaText}
          trendUp={occupancyDelta.up}
        />
        <KpiCard
          icon={Wrench}
          label="Charges"
          value={formatCHF(totals.expenses)}
          sub={`vs ${formatCHF(totals.expensesPrior)} (an -1)`}
          trend={costsDelta.text}
          trendUp={costsDelta.up === null ? null : !costsDelta.up}
        />
        <KpiCard
          icon={Building}
          label="Résultat net"
          value={formatCHF(totals.netIncome)}
          sub={totals.revenue > 0 ? `Marge ${((totals.netIncome / totals.revenue) * 100).toFixed(1)}%` : "—"}
          trend={netDelta.text}
          trendUp={netDelta.up}
        />
      </div>

      {/* ── Revenue evolution ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <ChartCard title="Évolution des recettes" subtitle="Basé sur les comptes 101-107">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#45553A" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#45553A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="xLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {yoyEnabled && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
              <Area type="monotone" dataKey="revenue" name="Recettes" stroke="#45553A" strokeWidth={2.5} fill="url(#gradRevenue)" />
              {yoyEnabled && (
                <Area type="monotone" dataKey="revenuePrior" name="Recettes (an -1)" stroke="#9CA3AF" strokeDasharray="4 3" strokeWidth={2} fill="none" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Occupancy + Costs evolution ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
        <ChartCard title="Évolution du taux d'occupation" subtitle="Calculé depuis les baux locataires">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="xLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              {yoyEnabled && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
              <Line type="monotone" dataKey="occupancy" name="Occupation" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: "#3B82F6", r: 3 }} activeDot={{ r: 5 }} />
              {yoyEnabled && (
                <Line type="monotone" dataKey="occupancyPrior" name="Occupation (an -1)" stroke="#9CA3AF" strokeDasharray="4 3" strokeWidth={2} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Charges vs résultat net" subtitle="Comptes 201-219 net des remboursements">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradCosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="xLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="expenses" name="Charges" stroke="#EF4444" strokeWidth={2} fill="url(#gradCosts)" />
              <Area type="monotone" dataKey="netIncome" name="Résultat net" stroke="#22C55E" strokeWidth={2} fill="url(#gradNet)" />
              {yoyEnabled && (
                <>
                  <Area type="monotone" dataKey="expensesPrior" name="Charges (an -1)" stroke="#FCA5A5" strokeDasharray="4 3" strokeWidth={1.5} fill="none" />
                  <Area type="monotone" dataKey="netIncomePrior" name="Résultat net (an -1)" stroke="#86EFAC" strokeDasharray="4 3" strokeWidth={1.5} fill="none" />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Net income bar ─────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <ChartCard title="Résultat net mensuel" subtitle="Recettes moins charges d'exploitation">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={yoyEnabled ? 16 : 28} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="xLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {yoyEnabled && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
              <Bar dataKey="netIncome" name="Résultat net" fill="#45553A" radius={[6, 6, 0, 0]} />
              {yoyEnabled && (
                <Bar dataKey="netIncomePrior" name="Résultat net (an -1)" fill="#9CA3AF" radius={[6, 6, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Building comparison ────────────────────────────── */}
      {buildings.length > 0 && (
        <div>
          <ChartCard
            title="Comparaison par immeuble"
            subtitle={`Recettes, charges et résultat net — ${MONTHS[comparisonMonth]} ${comparisonYear}`}
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Selector<number>
                  value={comparisonMonth}
                  onChange={setComparisonMonth}
                  options={MONTHS.map((m, i) => ({ value: i, label: m }))}
                  ariaLabel="Mois"
                />
                <Selector<number>
                  value={comparisonYear}
                  onChange={setComparisonYear}
                  options={comparisonYearOptions}
                  ariaLabel="Année"
                />
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={comparisonSeries} barGap={3} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const occ = d.units > 0 ? Math.round((d.occupiedUnits / d.units) * 100) : 0;
                    const deltaRev = formatDeltaPct(d.revenue, d.revenuePrior);
                    return (
                      <div
                        style={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "12px 16px",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                        }}
                      >
                        <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                          {d.fullName}
                        </p>
                        <p className="text-[11px]" style={{ color: "#45553A" }}>
                          Recettes: {formatCHF(d.revenue)}
                          {d.revenuePrior !== 0 && <span style={{ color: "var(--muted-foreground)", marginLeft: 6 }}>({deltaRev.text} YoY)</span>}
                        </p>
                        <p className="text-[11px]" style={{ color: "#EF4444" }}>
                          Charges: {formatCHF(d.costs)}
                        </p>
                        <p className="text-[11px]" style={{ color: "#22C55E" }}>
                          Résultat net: {formatCHF(d.netIncome)}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                          {d.occupiedUnits}/{d.units} unités occupées ({occ}%)
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Recettes" fill="#45553A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costs" name="Charges" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netIncome" name="Résultat net" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
