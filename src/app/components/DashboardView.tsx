// app/components/DashboardView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  TrendingUp,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  MapPin,
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

/* ─── Helpers ───────────────────────────────────────────────── */

const BUILDING_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=900&q=80",
];

const formatCHF = (v: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v)}`;

/* ─── SVG Donut ─────────────────────────────────────────────── */

function Donut({
  pct,
  size = 96,
  stroke = 10,
  color = "var(--primary)",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(100, Math.max(0, pct)) / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
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
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

/* ─── Status Badge ──────────────────────────────────────────── */

function Badge({ status, t }: { status: string; t: (k: string) => string }) {
  const map: Record<string, { bg: string; fg: string; key: string }> = {
    pending: { bg: "rgba(201,168,76,0.12)", fg: "#8A6A14", key: "pending" },
    "in-progress": { bg: "rgba(69,85,58,0.10)", fg: "#45553A", key: "inProgress" },
    completed: { bg: "rgba(69,85,58,0.16)", fg: "#2D4025", key: "completed" },
  };
  const c = map[status] ?? { bg: "var(--muted)", fg: "var(--muted-foreground)", key: status };
  return (
    <span
      className="rounded-full text-[11px] font-semibold shrink-0"
      style={{ padding: "3px 10px", background: c.bg, color: c.fg }}
    >
      {t(c.key)}
    </span>
  );
}

/* ─── Info Dialog item type ─────────────────────────────────── */

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
  const [featIdx, setFeatIdx] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const totalUnits = buildings.reduce((s, b) => s + (b.units ?? 0), 0);
  const occupied = buildings.reduce((s, b) => s + (b.occupiedUnits ?? 0), 0);
  const revenue = buildings.reduce((s, b) => s + (b.monthlyRevenue ?? 0), 0);
  const occPct = totalUnits > 0 ? (occupied / totalUnits) * 100 : 0;
  const pending = requests.filter((r) => r.status === "pending").length;

  const feat = buildings[featIdx] ?? null;
  const featPhoto = feat?.imageUrl || BUILDING_PHOTOS[featIdx % BUILDING_PHOTOS.length];
  const featUnits = feat?.units ?? 0;
  const featOccupied = feat?.occupiedUnits ?? 0;
  const featOccPct = featUnits > 0 ? (featOccupied / featUnits) * 100 : 0;

  const prev = () => setFeatIdx((i) => (i - 1 + Math.max(1, buildings.length)) % Math.max(1, buildings.length));
  const next = () => setFeatIdx((i) => (i + 1) % Math.max(1, buildings.length));

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
    [t],
  );

  /* ── Card wrapper ─── */
  const Card = ({
    children,
    className = "",
    style = {},
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-6" style={{ background: "var(--background)" }}>

      {/* ── HERO: Split Building Card ──────────────────── */}
      <Card className="overflow-hidden" style={{ minHeight: 320 }}>
        <div className="flex flex-col lg:flex-row">
          {/* Image side */}
          <div className="relative lg:w-[55%] min-h-[240px] lg:min-h-[320px]">
            <img
              src={featPhoto}
              alt={feat?.name ?? "Building"}
              className="absolute inset-0 w-full h-full object-cover"
              key={featPhoto}
            />
            {/* Subtle gradient for nav dots only */}
            <div
              className="absolute inset-x-0 bottom-0 h-20"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }}
            />

            {/* Building dots */}
            {buildings.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={prev}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-white" />
                </button>

                <div className="flex items-center gap-1.5">
                  {buildings.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFeatIdx(i)}
                      className="transition-all duration-200 rounded-full"
                      style={{
                        width: i === featIdx ? 20 : 7,
                        height: 7,
                        background: i === featIdx ? "#fff" : "rgba(255,255,255,0.45)",
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={next}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Info side */}
          <div className="lg:w-[45%] p-7 lg:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full"
                  style={{
                    background: "var(--sidebar-accent)",
                    color: "var(--primary)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {t("buildingsPortfolio")}
                </span>
              </div>

              <h2 className="text-2xl font-bold leading-tight" style={{ color: "var(--foreground)" }}>
                {feat?.name ?? t("dashboardTitle")}
              </h2>

              {feat && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {feat.address}
                  </p>
                </div>
              )}

              {/* Mini stats row */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                {[
                  { label: t("totalUnits"), value: featUnits },
                  { label: t("occupancy"), value: `${featOccPct.toFixed(0)}%` },
                  { label: t("monthlyRevenue"), value: formatCHF(feat?.monthlyRevenue ?? 0) },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-3"
                    style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                      {s.label}
                    </p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 mt-6">
              {feat && (
                <button
                  type="button"
                  onClick={() => onSelectBuilding(feat.id)}
                  className="flex items-center gap-2 text-sm font-semibold rounded-xl transition-colors"
                  style={{
                    padding: "9px 18px",
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Détails
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsInfoOpen(true)}
                className="flex items-center gap-2 text-sm font-medium rounded-xl transition-colors"
                style={{
                  padding: "9px 18px",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                <Info className="w-4 h-4" />
                {t("importantInfo")}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── KPI CARDS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Building2,
            label: t("totalBuildings"),
            value: buildings.length,
            sub: `${totalUnits} ${t("totalUnits")}`,
            accent: false,
            trend: true,
          },
          {
            icon: Users,
            label: t("occupancyRate"),
            value: `${occPct.toFixed(1)}%`,
            sub: `${occupied} ${t("occupiedOf")} ${totalUnits}`,
            accent: true,
            trend: true,
          },
          {
            icon: DollarSign,
            label: t("monthlyRevenue"),
            value: formatCHF(revenue),
            sub: t("combinedTotal"),
            accent: true,
            trend: true,
          },
          {
            icon: Wrench,
            label: t("pendingRequests"),
            value: pending,
            sub: `${requests.length} ${t("totalRequests")}`,
            accent: false,
            trend: false,
            alert: pending > 0,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: kpi.accent ? "rgba(69,85,58,0.08)" : "var(--background)",
                    border: kpi.accent ? "none" : "1px solid var(--border)",
                  }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: "var(--primary)" }} />
                </div>

                {kpi.trend && <TrendingUp className="w-4 h-4" style={{ color: "var(--primary)" }} />}
                {(kpi as any).alert && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: "rgba(201,168,76,0.12)", color: "#8A6A14" }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {t("actionNeeded")}
                  </span>
                )}
              </div>

              <div>
                <p
                  className="text-[10px] font-semibold uppercase mb-0.5"
                  style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em" }}
                >
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold leading-none" style={{ color: "var(--foreground)" }}>
                  {kpi.value}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {kpi.sub}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── BOTTOM GRID ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Requests — 3 cols */}
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
                {t("recentRequests")}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {t("recentRequestsSub")}
              </p>
            </div>
            <span
              className="text-[10px] font-semibold uppercase rounded-full"
              style={{
                padding: "4px 10px",
                background: "var(--background)",
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
                letterSpacing: "0.06em",
              }}
            >
              {t("liveData")}
            </span>
          </div>

          <div className="space-y-2">
            {requests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 rounded-xl p-3.5 transition-colors cursor-pointer"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(69,85,58,0.07)" }}
                >
                  <Wrench className="w-4 h-4" style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {req.title}
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                    {req.buildingName} · Apt {req.unit} · {req.tenantName}
                  </p>
                </div>
                <Badge status={req.status} t={t} />
              </div>
            ))}

            {requests.length === 0 && (
              <div className="text-center py-10">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{t("noRequestsYet")}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{t("allRequestsHere")}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Portfolio Health — 2 cols */}
        <Card className="lg:col-span-2 p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
              {t("quickStats")}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {t("quickStatsSub")}
            </p>
          </div>

          {/* Donut */}
          <div className="flex items-center gap-5 justify-center py-2">
            <Donut pct={occPct} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {t("occupancy")}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {occupied} {t("unitsOccupied")}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {totalUnits - occupied} {t("totalUnits")} vacants
              </p>
            </div>
          </div>

          {/* Stat rows */}
          <div className="space-y-3 flex-1">
            {[
              { label: t("totalProperties"), value: buildings.length.toString(), bar: 100, color: "var(--primary)" },
              { label: t("activeTenants"), value: occupied.toString(), bar: occPct, color: "var(--primary)" },
              { label: t("pendingRequests"), value: pending.toString(), bar: requests.length > 0 ? (pending / requests.length) * 100 : 0, color: "#C9A84C" },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl p-3.5"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{row.label}</p>
                  <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{row.value}</p>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(2, Math.min(100, row.bar))}%`, background: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Bottom metrics strip ───────────────────────── */}
      <Card className="px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {[
            { label: t("totalUnits"), value: totalUnits.toString() },
            { label: t("occupancyRate"), value: `${occPct.toFixed(1)}%` },
            { label: t("monthlyRevenue"), value: formatCHF(revenue) },
            { label: t("pendingRequests"), value: pending.toString() },
            { label: t("activeTenants"), value: occupied.toString() },
          ].map((m, i, arr) => (
            <React.Fragment key={m.label}>
              <div className="text-center">
                <p
                  className="text-[10px] font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
                >
                  {m.label}
                </p>
                <p className="text-lg font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
                  {m.value}
                </p>
              </div>
              {i < arr.length - 1 && (
                <div className="h-8 w-px hidden sm:block" style={{ background: "var(--border)" }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* ── Info Dialog ────────────────────────────────── */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent
          className="max-w-2xl rounded-2xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              {t("importantInformation")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2.5 mt-4 max-h-[60vh] overflow-y-auto pr-1">
            {infoItems.map((item) => (
              <div
                key={item.Title}
                className="rounded-xl p-4"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{item.Title}</p>
                  {item.Tag && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                      style={{ background: "rgba(69,85,58,0.08)", color: "var(--primary)" }}
                    >
                      {item.Tag}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {item.Description}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
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
  const myTenant = tenants.find((te) => te.email === userEmail);
  const myBuilding = buildings.find((b) => b.id === myTenant?.buildingId);
  const myRequests = requests.filter((r) => r.tenantId === userId);
  const pendingCount = myRequests.filter((r) => r.status === "pending").length;
  const inProgressCount = myRequests.filter((r) => r.status === "in-progress").length;
  const heroPhoto = myBuilding?.imageUrl || BUILDING_PHOTOS[0];

  const Card = ({
    children,
    className = "",
    style = {},
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-6" style={{ background: "var(--background)" }}>
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="relative lg:w-[50%] min-h-[220px] lg:min-h-[280px]">
            <img src={heroPhoto} alt={myBuilding?.name ?? ""} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="lg:w-[50%] p-7 flex flex-col justify-center">
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("hello")},</p>
            <h2 className="text-2xl font-bold mt-1" style={{ color: "var(--foreground)" }}>{userName}</h2>
            {myBuilding && (
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {myBuilding.name} — {myBuilding.address}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Home, label: t("myBuilding"), value: myBuilding?.name ?? "—", sub: myTenant?.unit ? `Apt ${myTenant.unit}` : undefined },
          { icon: DollarSign, label: t("monthlyRent"), value: myTenant ? formatCHF(myTenant.rent) : "—", sub: t("currentAmount") },
          { icon: Wrench, label: t("waiting"), value: pendingCount, sub: t("requests") },
          { icon: AlertCircle, label: t("ongoing"), value: inProgressCount, sub: t("requests") },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                <Icon className="w-[18px] h-[18px]" style={{ color: "var(--primary)" }} />
              </div>
              <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em" }}>
                {kpi.label}
              </p>
              <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{kpi.sub}</p>}
            </Card>
          );
        })}
      </div>

      {/* Lease */}
      <Card className="p-6">
        <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("leaseInfo")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("unit"), value: myTenant?.unit ?? "—" },
            { label: t("address"), value: myBuilding?.address ?? "—" },
            { label: t("leaseStart"), value: myTenant?.leaseStart ? new Date(myTenant.leaseStart).toLocaleDateString("fr-CH") : "—" },
            { label: t("leaseEnd"), value: myTenant?.leaseEnd ? new Date(myTenant.leaseEnd).toLocaleDateString("fr-CH") : "—" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-3.5"
              style={{ background: "var(--background)", border: "1px solid var(--border)" }}
            >
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                {item.label}
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Requests */}
      {myRequests.length > 0 && (
        <Card className="p-6">
          <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--foreground)" }}>{t("recentRequests")}</h3>
          <div className="space-y-2">
            {myRequests.slice(0, 4).map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 rounded-xl p-3.5"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(69,85,58,0.07)" }}>
                  <Wrench className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{req.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{req.buildingName} · Apt {req.unit}</p>
                </div>
                <Badge status={req.status} t={t} />
              </div>
            ))}
          </div>
        </Card>
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
