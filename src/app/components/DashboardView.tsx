// app/components/DashboardView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  MapPin,
  TrendingUp,
  Home,
} from "lucide-react";
import {
  getBuildings,
  getTenants,
  getMaintenanceRequests,
  type Building,
  type Tenant,
  type MaintenanceRequest,
} from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { BuildingDetailsView } from "./BuildingDetailsView";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Constants ─────────────────────────────────────────────── */

const BUILDING_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=85",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=85",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1600&q=85",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=85",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=85",
];

const formatCHF = (v: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v)}`;

/* ─── SVG Donut Chart ────────────────────────────────────────── */

function DonutChart({
  pct,
  size = 110,
  stroke = 12,
  color = "#C9A84C",
  trackColor = "rgba(210,195,165,0.35)",
  label,
  sublabel,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(100, Math.max(0, pct)) / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          {/* Fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color: "#1A1614" }}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-center" style={{ color: "#8A7D72" }}>
        {label}
      </p>
      {sublabel && (
        <p className="text-xs text-center" style={{ color: "#A09488" }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

/* ─── Mini Bar Chart ─────────────────────────────────────────── */

function MiniBarChart({
  bars,
  maxValue,
  color = "#C9A84C",
  highlightIdx,
}: {
  bars: { label: string; value: number }[];
  maxValue: number;
  color?: string;
  highlightIdx?: number;
}) {
  return (
    <div className="flex items-end gap-2 h-20">
      {bars.map((b, i) => {
        const h = maxValue > 0 ? (b.value / maxValue) * 100 : 0;
        const isHighlight = i === highlightIdx;
        return (
          <div key={b.label} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max(4, h)}%`,
                maxHeight: "64px",
                minHeight: "4px",
                background: isHighlight ? color : "rgba(210,195,165,0.5)",
              }}
            />
            <span className="text-[10px]" style={{ color: "#A09488" }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Glass Card ─────────────────────────────────────────────── */

function GlassPanel({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl backdrop-blur-xl ${className}`}
      style={{
        background: "rgba(255,255,255,0.16)",
        border: "1px solid rgba(255,255,255,0.22)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Metric Card ────────────────────────────────────────────── */

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4 group hover:shadow-md transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(215,200,178,0.55)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: accent ? "rgba(201,168,76,0.15)" : "rgba(210,195,165,0.25)",
          }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: accent ? "#C9A84C" : "#7A6E63" }}
          />
        </div>
        {badge}
      </div>

      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "#9A8C80" }}
        >
          {label}
        </p>
        <p
          className="text-3xl font-bold leading-none"
          style={{ color: "#1A1614" }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-sm mt-1.5" style={{ color: "#9A8C80" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Status Badge ───────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: "En attente", bg: "rgba(201,168,76,0.15)", color: "#9A7A1A" },
    "in-progress": { label: "En cours", bg: "rgba(69,85,58,0.12)", color: "#45553A" },
    completed: { label: "Terminé", bg: "rgba(69,85,58,0.18)", color: "#2D4025" },
  };
  const c = cfg[status] ?? { label: status, bg: "rgba(200,185,165,0.2)", color: "#7A6E63" };
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

/* ─── Info types ─────────────────────────────────────────────── */

type InfoItem = { Title: string; Description: string; Tag?: string };

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════ */

function AdminDashboard({
  buildings,
  tenants,
  requests,
  onSelectBuilding,
}: {
  buildings: Building[];
  tenants: Tenant[];
  requests: MaintenanceRequest[];
  onSelectBuilding: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const totalUnits = buildings.reduce((s, b) => s + (b.units ?? 0), 0);
  const occupiedUnits = buildings.reduce((s, b) => s + (b.occupiedUnits ?? 0), 0);
  const totalRevenue = buildings.reduce((s, b) => s + (b.monthlyRevenue ?? 0), 0);
  const occupancyPct = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const inProgressRequests = requests.filter((r) => r.status === "in-progress").length;

  const featured = buildings[featuredIdx] ?? null;
  const featuredPhoto =
    featured?.imageUrl || BUILDING_PHOTOS[featuredIdx % BUILDING_PHOTOS.length];

  const prev = () => setFeaturedIdx((i) => (i - 1 + Math.max(1, buildings.length)) % Math.max(1, buildings.length));
  const next = () => setFeaturedIdx((i) => (i + 1) % Math.max(1, buildings.length));

  const revenueByBuilding = buildings.map((b) => ({
    label: b.name.split(" ")[0] ?? b.name,
    value: b.monthlyRevenue ?? 0,
  }));
  const maxRevenue = Math.max(...revenueByBuilding.map((b) => b.value), 1);

  const infoItems: InfoItem[] = useMemo(
    () => [
      { Title: t("infoReferenceRate"), Tag: t("tagSwitzerland"), Description: t("infoReferenceRateDesc") },
      { Title: t("infoCpiIndex"), Tag: t("tagManagement"), Description: t("infoCpiIndexDesc") },
      { Title: t("infoRenewal"), Tag: t("tagProcess"), Description: t("infoRenewalDesc") },
      { Title: t("infoMaintenance"), Tag: t("tagExploitation"), Description: t("infoMaintenanceDesc") },
      { Title: t("infoInsurance"), Tag: t("tagRisk"), Description: t("infoInsuranceDesc") },
      { Title: t("infoCharges"), Tag: t("tagFinance"), Description: t("infoChargesDesc") },
      { Title: t("infoVacancy"), Tag: t("tagRental"), Description: t("infoVacancyDesc") },
      { Title: t("infoDocumentation"), Tag: t("tagCompliance"), Description: t("infoDocumentationDesc") },
    ],
    [t]
  );

  return (
    <div
      className="min-h-full px-6 py-8 space-y-6"
      style={{ background: "var(--background)" }}
    >

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden w-full"
        style={{ height: "58vh", minHeight: "420px" }}
      >
        {/* Background photo */}
        <img
          src={featuredPhoto}
          alt={featured?.name ?? "Property"}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
          key={featuredPhoto}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(12,8,4,0.65) 0%, rgba(12,8,4,0.35) 45%, rgba(12,8,4,0.10) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "55%",
            background:
              "linear-gradient(to top, rgba(10,7,4,0.70) 0%, transparent 100%)",
          }}
        />

        {/* ── Left glass panel ─── */}
        <GlassPanel className="absolute top-7 left-7 p-5 flex flex-col gap-4 min-w-[170px]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">
              {t("totalBuildings")}
            </p>
            <p className="text-3xl font-bold text-white leading-none">
              {buildings.length}
            </p>
            <p className="text-xs text-white/55 mt-0.5">
              {totalUnits} {t("totalUnits")}
            </p>
          </div>

          <div className="h-px bg-white/15" />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">
              {t("activeTenants")}
            </p>
            <p className="text-2xl font-bold text-white leading-none">
              {occupiedUnits}
            </p>
            <p className="text-xs text-white/55 mt-0.5">{t("acrossProperties")}</p>
          </div>

          <div className="h-px bg-white/15" />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">
              {t("monthlyRevenue")}
            </p>
            <p className="text-lg font-bold text-white leading-none">
              {formatCHF(totalRevenue)}
            </p>
          </div>
        </GlassPanel>

        {/* ── Right glass panel: occupancy donut ─── */}
        <GlassPanel className="absolute top-7 right-7 p-5 flex flex-col items-center gap-4 min-w-[150px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 self-start">
            {t("occupancyRate")}
          </p>

          {/* SVG donut (white version for hero) */}
          <div className="relative" style={{ width: 100, height: 100 }}>
            <svg width={100} height={100} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={50} cy={50} r={38} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={11} />
              <circle
                cx={50}
                cy={50}
                r={38}
                fill="none"
                stroke="#C9A84C"
                strokeWidth={11}
                strokeDasharray={`${(occupancyPct / 100) * (2 * Math.PI * 38)} ${2 * Math.PI * 38}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">
                {occupancyPct.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-white/55">
              {occupiedUnits} {t("occupiedOf")} {totalUnits}
            </p>
          </div>
        </GlassPanel>

        {/* ── Center bottom: building info ─── */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-7">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(201,168,76,0.30)", color: "#E8CC7A" }}
                >
                  {t("buildingsPortfolio")}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight truncate">
                {featured?.name ?? t("dashboardTitle")}
              </h2>
              {featured && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-white/55 shrink-0" />
                  <p className="text-sm text-white/65 truncate">{featured.address}</p>
                </div>
              )}

              {/* Building navigation dots */}
              {buildings.length > 1 && (
                <div className="flex items-center gap-2 mt-4">
                  {buildings.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFeaturedIdx(i)}
                      className="transition-all duration-200"
                      style={{
                        width: i === featuredIdx ? "24px" : "8px",
                        height: "8px",
                        borderRadius: "4px",
                        background: i === featuredIdx ? "#C9A84C" : "rgba(255,255,255,0.40)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Prev/Next arrows */}
              {buildings.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </>
              )}

              {featured && (
                <button
                  type="button"
                  onClick={() => onSelectBuilding(featured.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    color: "#fff",
                  }}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Détails
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Building thumbnail strip (if >1 building) ─── */}
        {buildings.length > 1 && (
          <div className="absolute bottom-0 right-8 pb-7 flex gap-2">
            {buildings.slice(0, 4).map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setFeaturedIdx(i)}
                className="rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  width: 56,
                  height: 42,
                  outline: i === featuredIdx ? "2px solid #C9A84C" : "2px solid transparent",
                  outlineOffset: "2px",
                  opacity: i === featuredIdx ? 1 : 0.6,
                }}
              >
                <img
                  src={b.imageUrl || BUILDING_PHOTOS[i % BUILDING_PHOTOS.length]}
                  alt={b.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* ── Info button ─── */}
        <button
          type="button"
          onClick={() => setIsInfoOpen(true)}
          className="absolute top-7 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
          style={{
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <Info className="w-3.5 h-3.5" />
          {t("importantInfo")}
        </button>
      </div>

      {/* ── 4 KPI METRIC CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          label={t("totalBuildings")}
          value={buildings.length}
          sub={`${totalUnits} ${t("totalUnits")}`}
          badge={<TrendingUp className="w-4 h-4" style={{ color: "#C9A84C" }} />}
        />
        <MetricCard
          icon={Users}
          label={t("occupancyRate")}
          value={`${occupancyPct.toFixed(1)}%`}
          sub={`${occupiedUnits} ${t("occupiedOf")} ${totalUnits}`}
          accent
          badge={<TrendingUp className="w-4 h-4" style={{ color: "#C9A84C" }} />}
        />
        <MetricCard
          icon={DollarSign}
          label={t("monthlyRevenue")}
          value={formatCHF(totalRevenue)}
          sub={t("combinedTotal")}
          accent
          badge={<TrendingUp className="w-4 h-4" style={{ color: "#C9A84C" }} />}
        />
        <MetricCard
          icon={Wrench}
          label={t("pendingRequests")}
          value={pendingRequests}
          sub={`${requests.length} ${t("totalRequests")}`}
          badge={
            pendingRequests > 0 ? (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "rgba(201,168,76,0.18)", color: "#9A7A1A" }}
              >
                <AlertCircle className="w-3 h-3" />
                {t("actionNeeded")}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* ── BOTTOM GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Requests — 3/5 */}
        <div
          className="lg:col-span-3 rounded-2xl p-7"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(215,200,178,0.55)",
          }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold" style={{ color: "#1A1614" }}>
                {t("recentRequests")}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: "#9A8C80" }}>
                {t("recentRequestsSub")}
              </p>
            </div>
            <span
              className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 rounded-full"
              style={{ background: "rgba(201,168,76,0.15)", color: "#9A7A1A" }}
            >
              {t("liveData")}
            </span>
          </div>

          <div className="space-y-3">
            {requests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 p-4 rounded-xl group cursor-pointer transition-colors"
                style={{ background: "rgba(245,240,234,0.7)", border: "1px solid rgba(210,195,165,0.4)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(201,168,76,0.15)" }}
                >
                  <Wrench className="w-4 h-4" style={{ color: "#C9A84C" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#1A1614" }}>
                    {req.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#9A8C80" }}>
                    {req.buildingName} · Apt {req.unit} · {req.tenantName}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}

            {requests.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "#8A7D72" }} />
                <p className="text-sm font-medium" style={{ color: "#1A1614" }}>{t("noRequestsYet")}</p>
                <p className="text-xs mt-1" style={{ color: "#9A8C80" }}>{t("allRequestsHere")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Health — 2/5 */}
        <div
          className="lg:col-span-2 rounded-2xl p-7 flex flex-col gap-6"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(215,200,178,0.55)",
          }}
        >
          <div>
            <h3 className="text-base font-semibold" style={{ color: "#1A1614" }}>
              {t("quickStats")}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: "#9A8C80" }}>
              {t("quickStatsSub")}
            </p>
          </div>

          {/* Occupancy donut */}
          <div className="flex justify-center py-2">
            <DonutChart
              pct={occupancyPct}
              size={120}
              stroke={13}
              color="#C9A84C"
              label={t("occupancy")}
              sublabel={`${occupiedUnits} ${t("unitsOccupied")}`}
            />
          </div>

          {/* Revenue by building bars */}
          {buildings.length > 0 && (
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "#9A8C80" }}
              >
                {t("monthlyRevenue")} / immeuble
              </p>
              <MiniBarChart
                bars={revenueByBuilding}
                maxValue={maxRevenue}
                color="#C9A84C"
                highlightIdx={featuredIdx}
              />
            </div>
          )}

          {/* Quick stats strip */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: "rgba(210,195,165,0.4)" }}>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#1A1614" }}>
                {buildings.length}
              </p>
              <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "#9A8C80" }}>
                {t("totalProperties")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#C9A84C" }}>
                {inProgressRequests}
              </p>
              <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "#9A8C80" }}>
                En cours
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status strip at bottom */}
      <div
        className="rounded-2xl px-7 py-5 flex items-center justify-between gap-6 flex-wrap"
        style={{
          background: "rgba(255,255,255,0.90)",
          border: "1px solid rgba(215,200,178,0.55)",
        }}
      >
        {[
          { label: t("totalUnits"), value: totalUnits.toString() },
          { label: t("occupancyRate"), value: `${occupancyPct.toFixed(1)}%` },
          { label: t("monthlyRevenue"), value: formatCHF(totalRevenue) },
          { label: t("pendingRequests"), value: pendingRequests.toString() },
          { label: t("activeTenants"), value: occupiedUnits.toString() },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9A8C80" }}>
                {item.label}
              </p>
              <p className="text-xl font-bold mt-0.5" style={{ color: "#1A1614" }}>
                {item.value}
              </p>
            </div>
            {i < arr.length - 1 && (
              <div className="h-8 w-px hidden sm:block" style={{ background: "rgba(210,195,165,0.4)" }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── INFO DIALOG ────────────────────────────────────────── */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent
          className="max-w-3xl rounded-3xl"
          style={{
            background: "#FAF8F4",
            border: "1px solid rgba(215,200,178,0.6)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ color: "#1A1614" }}>
              {t("importantInformation")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-5 max-h-[60vh] overflow-y-auto pr-1">
            {infoItems.map((item) => (
              <div
                key={item.Title}
                className="rounded-xl p-5"
                style={{
                  background: "rgba(255,255,255,0.90)",
                  border: "1px solid rgba(215,200,178,0.5)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="font-semibold text-sm" style={{ color: "#1A1614" }}>
                    {item.Title}
                  </p>
                  {item.Tag && (
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
                      style={{ background: "rgba(201,168,76,0.15)", color: "#9A7A1A" }}
                    >
                      {item.Tag}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#7A6E63" }}>
                  {item.Description}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs" style={{ color: "#A09488" }}>
            {t("infoDisclaimer")}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TENANT DASHBOARD
═══════════════════════════════════════════════════════════════ */

function TenantDashboard({
  buildings,
  tenants,
  requests,
  userEmail,
  userId,
  userName,
}: {
  buildings: Building[];
  tenants: Tenant[];
  requests: MaintenanceRequest[];
  userEmail: string;
  userId: string;
  userName: string;
}) {
  const { t } = useLanguage();
  const myTenant = tenants.find((t) => t.email === userEmail);
  const myBuilding = buildings.find((b) => b.id === myTenant?.buildingId);
  const myRequests = requests.filter((r) => r.tenantId === userId);
  const pending = myRequests.filter((r) => r.status === "pending").length;
  const inProgress = myRequests.filter((r) => r.status === "in-progress").length;

  const heroPhoto =
    myBuilding?.imageUrl || BUILDING_PHOTOS[0];

  return (
    <div
      className="min-h-full px-6 py-8 space-y-6"
      style={{ background: "var(--background)" }}
    >
      {/* Hero */}
      <div
        className="relative rounded-3xl overflow-hidden w-full"
        style={{ height: "50vh", minHeight: "360px" }}
      >
        <img
          src={heroPhoto}
          alt={myBuilding?.name ?? "Property"}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(12,8,4,0.62) 0%, rgba(12,8,4,0.30) 50%, rgba(12,8,4,0.08) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "50%",
            background: "linear-gradient(to top, rgba(10,7,4,0.68) 0%, transparent 100%)",
          }}
        />

        {/* Left glass: greeting */}
        <GlassPanel className="absolute top-7 left-7 p-5">
          <p className="text-xs text-white/60 mb-1">{t("hello")}</p>
          <p className="text-2xl font-bold text-white leading-tight">{userName}</p>
          <p className="text-xs text-white/55 mt-1">{t("tenant")}</p>
        </GlassPanel>

        {/* Right glass: rent */}
        {myTenant && (
          <GlassPanel className="absolute top-7 right-7 p-5 text-right">
            <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1">
              {t("monthlyRent")}
            </p>
            <p className="text-2xl font-bold text-white">{formatCHF(myTenant.rent)}</p>
            <p className="text-xs text-white/55 mt-0.5">{t("currentAmount")}</p>
          </GlassPanel>
        )}

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-7">
          <h2 className="text-3xl font-bold text-white truncate">
            {myBuilding?.name ?? t("myBuilding")}
          </h2>
          {myBuilding && (
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-white/55 shrink-0" />
              <p className="text-sm text-white/65">{myBuilding.address}</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Home}
          label={t("myBuilding")}
          value={myBuilding?.name ?? "—"}
          sub={myTenant?.unit ? `Apt ${myTenant.unit}` : undefined}
        />
        <MetricCard
          icon={DollarSign}
          label={t("monthlyRent")}
          value={myTenant ? formatCHF(myTenant.rent) : "—"}
          sub={t("currentAmount")}
          accent
        />
        <MetricCard
          icon={Wrench}
          label={t("waiting")}
          value={pending}
          sub={t("requests")}
          badge={
            pending > 0 ? (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: "rgba(201,168,76,0.18)", color: "#9A7A1A" }}
              >
                <AlertCircle className="w-3 h-3" />
                {t("actionNeeded")}
              </span>
            ) : undefined
          }
        />
        <MetricCard
          icon={AlertCircle}
          label={t("ongoing")}
          value={inProgress}
          sub={t("requests")}
        />
      </div>

      {/* Lease card */}
      <div
        className="rounded-2xl p-7"
        style={{
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(215,200,178,0.55)",
        }}
      >
        <h3 className="text-base font-semibold mb-5" style={{ color: "#1A1614" }}>
          {t("leaseInfo")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t("unit"), value: myTenant?.unit ?? "—" },
            { label: t("address"), value: myBuilding?.address ?? "—" },
            {
              label: t("leaseStart"),
              value: myTenant?.leaseStart
                ? new Date(myTenant.leaseStart).toLocaleDateString("fr-CH")
                : "—",
            },
            {
              label: t("leaseEnd"),
              value: myTenant?.leaseEnd
                ? new Date(myTenant.leaseEnd).toLocaleDateString("fr-CH")
                : "—",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-4"
              style={{ background: "rgba(245,240,234,0.8)", border: "1px solid rgba(210,195,165,0.4)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#9A8C80" }}>
                {item.label}
              </p>
              <p className="text-sm font-semibold" style={{ color: "#1A1614" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent requests */}
      {myRequests.length > 0 && (
        <div
          className="rounded-2xl p-7"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(215,200,178,0.55)",
          }}
        >
          <h3 className="text-base font-semibold mb-5" style={{ color: "#1A1614" }}>
            {t("recentRequests")}
          </h3>
          <div className="space-y-3">
            {myRequests.slice(0, 4).map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{
                  background: "rgba(245,240,234,0.7)",
                  border: "1px solid rgba(210,195,165,0.4)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(201,168,76,0.15)" }}
                >
                  <Wrench className="w-4 h-4" style={{ color: "#C9A84C" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#1A1614" }}>
                    {req.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A8C80" }}>
                    {req.buildingName} · Apt {req.unit}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */

export function DashboardView() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  useEffect(() => {
    setBuildings(getBuildings());
    setTenants(getTenants());
    setRequests(getMaintenanceRequests());
  }, []);

  if (selectedBuildingId) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <BuildingDetailsView
          buildingId={selectedBuildingId}
          onBack={() => setSelectedBuildingId(null)}
        />
      </div>
    );
  }

  if (user?.role === "tenant") {
    return (
      <TenantDashboard
        buildings={buildings}
        tenants={tenants}
        requests={requests}
        userEmail={user.email}
        userId={user.id}
        userName={user.name}
      />
    );
  }

  return (
    <AdminDashboard
      buildings={buildings}
      tenants={tenants}
      requests={requests}
      onSelectBuilding={setSelectedBuildingId}
    />
  );
}
