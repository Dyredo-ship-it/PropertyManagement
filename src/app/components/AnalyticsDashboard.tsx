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
  DollarSign,
  Users,
  Wrench,
  ChevronDown,
} from "lucide-react";
import { getBuildings, type Building as BuildingType } from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Fake data generator (seeded by building) ────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateMonthlyData(buildingId: string | null, buildings: BuildingType[]) {
  const seed = buildingId ? hashStr(buildingId) : 42;
  const rng = seededRandom(seed);

  const baseRevenue = buildingId
    ? (buildings.find((b) => b.id === buildingId)?.monthlyRevenue ?? 20000)
    : buildings.reduce((s, b) => s + (b.monthlyRevenue ?? 0), 0);

  const baseOccupancy = buildingId
    ? (() => {
        const b = buildings.find((x) => x.id === buildingId);
        return b && b.units > 0 ? (b.occupiedUnits / b.units) * 100 : 85;
      })()
    : (() => {
        const totalU = buildings.reduce((s, b) => s + (b.units ?? 0), 0);
        const occU = buildings.reduce((s, b) => s + (b.occupiedUnits ?? 0), 0);
        return totalU > 0 ? (occU / totalU) * 100 : 85;
      })();

  const baseCost = baseRevenue * 0.35;

  return MONTHS.map((month, i) => {
    const drift = 1 + (i - 6) * 0.015;
    const noise = () => 0.92 + rng() * 0.16;
    return {
      month,
      revenue: Math.round(baseRevenue * drift * noise()),
      costs: Math.round(baseCost * drift * noise()),
      occupancy: Math.min(100, Math.round(baseOccupancy * (0.94 + rng() * 0.12))),
      netIncome: 0,
    };
  }).map((d) => ({ ...d, netIncome: d.revenue - d.costs }));
}

function generateRevenueByBuilding(buildings: BuildingType[], monthIndex: number) {
  return buildings.map((b) => {
    const baseRevenue = b.monthlyRevenue ?? 0;
    const seed = hashStr(b.id);
    const rng = seededRandom(seed);
    // Advance rng to the right month
    for (let i = 0; i < monthIndex * 2; i++) rng();
    const drift = 1 + (monthIndex - 6) * 0.015;
    const noise = 0.92 + rng() * 0.16;
    const revenue = Math.round(baseRevenue * drift * noise);
    const costs = Math.round(revenue * 0.35);
    return {
      name: b.name.length > 16 ? b.name.slice(0, 16) + "…" : b.name,
      fullName: b.name,
      revenue,
      costs,
      netIncome: revenue - costs,
      units: b.units ?? 0,
      occupiedUnits: b.occupiedUnits ?? 0,
    };
  });
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const formatCHF = (v: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v)}`;

/* ─── Inline Building Selector (per chart) ────────────────────── */

function InlineSelector({
  buildings,
  selected,
  onChange,
}: {
  buildings: BuildingType[];
  selected: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={selected ?? "__all__"}
        onChange={(e) => onChange(e.target.value === "__all__" ? null : e.target.value)}
        style={{
          appearance: "none",
          padding: "6px 30px 6px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--background)",
          color: "var(--foreground)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          outline: "none",
        }}
      >
        <option value="__all__">All Buildings</option>
        {buildings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
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

/* ─── KPI Card ────────────────────────────────────────────────── */

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
  trendUp?: boolean;
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
              background: trendUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: trendUp ? "#16A34A" : "#DC2626",
            }}
          >
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
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

/* ─── Chart Card wrapper ──────────────────────────────────────── */

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
        padding: "24px 24px 16px",
      }}
    >
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h3
            className="text-[15px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
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

/* ─── Tooltip styling ─────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: any) {
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
          {entry.name}: {typeof entry.value === "number" && entry.name !== "Occupancy Rate"
            ? formatCHF(entry.value)
            : `${entry.value}%`}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN ANALYTICS DASHBOARD
═══════════════════════════════════════════════════════════════ */

export function AnalyticsDashboard() {
  const { t } = useLanguage();
  const [buildings, setBuildings] = useState<BuildingType[]>([]);

  // Each chart has its own building selector state
  const [revenueBuilding, setRevenueBuilding] = useState<string | null>(null);
  const [occupancyBuilding, setOccupancyBuilding] = useState<string | null>(null);
  const [costBuilding, setCostBuilding] = useState<string | null>(null);
  const [netIncomeBuilding, setNetIncomeBuilding] = useState<string | null>(null);
  const [comparisonMonth, setComparisonMonth] = useState<number>(new Date().getMonth());

  useEffect(() => {
    setBuildings(getBuildings());
  }, []);

  // Generate data per chart selector
  const revenueData = useMemo(() => generateMonthlyData(revenueBuilding, buildings), [revenueBuilding, buildings]);
  const occupancyData = useMemo(() => generateMonthlyData(occupancyBuilding, buildings), [occupancyBuilding, buildings]);
  const costData = useMemo(() => generateMonthlyData(costBuilding, buildings), [costBuilding, buildings]);
  const netIncomeData = useMemo(() => generateMonthlyData(netIncomeBuilding, buildings), [netIncomeBuilding, buildings]);
  const revenueByBuilding = useMemo(() => generateRevenueByBuilding(buildings, comparisonMonth), [buildings, comparisonMonth]);

  // KPI data (aggregate)
  const aggregateData = useMemo(() => generateMonthlyData(null, buildings), [buildings]);
  const totalRevenue = aggregateData.reduce((s, d) => s + d.revenue, 0);
  const totalCosts = aggregateData.reduce((s, d) => s + d.costs, 0);
  const avgOccupancy = Math.round(aggregateData.reduce((s, d) => s + d.occupancy, 0) / aggregateData.length);
  const totalUnits = buildings.reduce((s, b) => s + (b.units ?? 0), 0);

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1
          className="text-[22px] font-semibold leading-tight"
          style={{ color: "var(--foreground)" }}
        >
          Analytics
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          Real estate performance overview
        </p>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 36 }}>
        <KpiCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCHF(totalRevenue)}
          sub="Year to date"
          trend="+8.2%"
          trendUp
        />
        <KpiCard
          icon={Users}
          label="Occupancy Rate"
          value={`${avgOccupancy}%`}
          sub={`${totalUnits} total units`}
          trend="+2.1%"
          trendUp
        />
        <KpiCard
          icon={Wrench}
          label="Total Costs"
          value={formatCHF(totalCosts)}
          sub="Maintenance and operations"
          trend="-3.4%"
          trendUp
        />
        <KpiCard
          icon={Building}
          label="Net Income"
          value={formatCHF(totalRevenue - totalCosts)}
          sub={`${((1 - totalCosts / totalRevenue) * 100).toFixed(1)}% profit margin`}
          trend="+12.5%"
          trendUp
        />
      </div>

      {/* ── Revenue Evolution ────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <ChartCard
          title="Revenue Evolution"
          subtitle="Monthly revenue trend over the current year"
          action={
            <InlineSelector
              buildings={buildings}
              selected={revenueBuilding}
              onChange={setRevenueBuilding}
            />
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#45553A" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#45553A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#45553A"
                strokeWidth={2.5}
                fill="url(#gradRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Occupancy Rate & Cost Evolution ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginBottom: 28 }}>
        {/* Occupancy Rate Evolution */}
        <ChartCard
          title="Occupancy Rate Evolution"
          subtitle="Monthly occupancy percentage trend"
          action={
            <InlineSelector
              buildings={buildings}
              selected={occupancyBuilding}
              onChange={setOccupancyBuilding}
            />
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="occupancy"
                name="Occupancy Rate"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={{ fill: "#3B82F6", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost Evolution */}
        <ChartCard
          title="Cost Evolution"
          subtitle="Costs versus net income comparison"
          action={
            <InlineSelector
              buildings={buildings}
              selected={costBuilding}
              onChange={setCostBuilding}
            />
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={costData}>
              <defs>
                <linearGradient id="gradCosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="costs" name="Costs" stroke="#EF4444" strokeWidth={2} fill="url(#gradCosts)" />
              <Area type="monotone" dataKey="netIncome" name="Net Income" stroke="#22C55E" strokeWidth={2} fill="url(#gradNet)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Net Income Evolution ──────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <ChartCard
          title="Net Income Evolution"
          subtitle="Monthly profitability trend after all expenses"
          action={
            <InlineSelector
              buildings={buildings}
              selected={netIncomeBuilding}
              onChange={setNetIncomeBuilding}
            />
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={netIncomeData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="netIncome"
                name="Net Income"
                fill="#45553A"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Revenue Comparison by Building (always visible) ──── */}
      {buildings.length > 0 && (
        <div>
          <ChartCard
            title="Building Comparison"
            subtitle={`Revenue, costs, and net income for ${MONTHS[comparisonMonth]}`}
            action={
              <div style={{ position: "relative", display: "inline-block" }}>
                <select
                  value={comparisonMonth}
                  onChange={(e) => setComparisonMonth(Number(e.target.value))}
                  style={{
                    appearance: "none",
                    padding: "6px 30px 6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
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
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={revenueByBuilding} barGap={3} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const occ = d.units > 0 ? Math.round((d.occupiedUnits / d.units) * 100) : 0;
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
                          Revenue: {formatCHF(d.revenue)}
                        </p>
                        <p className="text-[11px]" style={{ color: "#EF4444" }}>
                          Costs: {formatCHF(d.costs)}
                        </p>
                        <p className="text-[11px]" style={{ color: "#22C55E" }}>
                          Net Income: {formatCHF(d.netIncome)}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                          {d.occupiedUnits}/{d.units} units occupied ({occ}%)
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#45553A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costs" name="Costs" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netIncome" name="Net Income" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
