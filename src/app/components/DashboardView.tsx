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
  Plus,
  Circle,
  Clock,
  CheckCircle2,
  Calendar,
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
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Helpers ───────────────────────────────────────────────── */

const BUILDING_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=900&q=80",
];

const formatCHF = (v: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v)}`;

const PRIORITY_STYLES: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  urgent:  { bg: "rgba(239,68,68,0.08)",  fg: "#DC2626", dot: "#EF4444", label: "Critical" },
  high:    { bg: "rgba(245,158,11,0.08)", fg: "#B45309", dot: "#F59E0B", label: "High" },
  medium:  { bg: "rgba(59,130,246,0.08)", fg: "#1D4ED8", dot: "#3B82F6", label: "Medium" },
  low:     { bg: "rgba(107,114,128,0.08)", fg: "#4B5563", dot: "#6B7280", label: "Low" },
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — Kanban style
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
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");

  const totalUnits = buildings.reduce((s, b) => s + (b.units ?? 0), 0);
  const occupied = buildings.reduce((s, b) => s + (b.occupiedUnits ?? 0), 0);
  const revenue = buildings.reduce((s, b) => s + (b.monthlyRevenue ?? 0), 0);
  const occPct = totalUnits > 0 ? (occupied / totalUnits) * 100 : 0;

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const cols = useMemo(() => {
    const pending = filteredRequests.filter((r) => r.status === "pending");
    const inProgress = filteredRequests.filter((r) => r.status === "in-progress");
    const completed = filteredRequests.filter((r) => r.status === "completed");
    return { pending, inProgress, completed };
  }, [filteredRequests]);

  /* Unique tenants with request count for the avatar row */
  const activePeople = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    requests.forEach((r) => {
      const existing = map.get(r.tenantId);
      if (existing) existing.count++;
      else map.set(r.tenantId, { name: r.tenantName, count: 1 });
    });
    // Also add building managers (buildings)
    buildings.forEach((b) => {
      if (!map.has(b.id)) {
        map.set(b.id, { name: b.name, count: b.units ?? 0 });
      }
    });
    return Array.from(map.entries())
      .slice(0, 6)
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        initials: data.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      }));
  }, [requests, buildings]);

  const filters = [
    { key: "all" as const, label: t("all") || "All" },
    { key: "pending" as const, label: t("pending") },
    { key: "in-progress" as const, label: t("inProgress") },
    { key: "completed" as const, label: t("completed") },
  ];

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* ── Page Header ───────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--sidebar-accent)" }}
          >
            <Building2 className="w-[18px] h-[18px]" style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h1
              className="text-[22px] font-semibold leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              {t("dashboardTitle")}
            </h1>
            <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
              {t("dashboardSub") || "Portfolio Overview & Task Management"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Pills ──────────────────────────────────────── */}
      <div className="flex items-center gap-2" style={{ marginBottom: 24 }}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="text-[13px] font-medium transition-all"
              style={{
                padding: "7px 16px",
                borderRadius: 10,
                border: active ? "1px solid var(--foreground)" : "1px solid var(--border)",
                background: active ? "var(--foreground)" : "var(--card)",
                color: active ? "var(--card)" : "var(--foreground)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.borderColor = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Team / Buildings Row ───────────────────────────────── */}
      <div
        className="flex items-center gap-4 overflow-x-auto pb-1"
        style={{ marginBottom: 28 }}
      >
        {activePeople.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-3 shrink-0"
            style={{
              padding: "10px 16px 10px 10px",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {person.initials}
            </div>
            <div className="min-w-0">
              <p
                className="text-[13px] font-medium leading-tight truncate"
                style={{ color: "var(--foreground)", maxWidth: 120 }}
              >
                {person.name}
              </p>
            </div>
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: "var(--sidebar-accent)",
                color: "var(--primary)",
              }}
            >
              {person.count}
            </span>
          </div>
        ))}
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        style={{ marginBottom: 28 }}
      >
        {[
          {
            icon: Building2,
            label: t("totalBuildings"),
            value: buildings.length,
            sub: `${totalUnits} ${t("totalUnits")}`,
          },
          {
            icon: Users,
            label: t("occupancyRate"),
            value: `${occPct.toFixed(1)}%`,
            sub: `${occupied} / ${totalUnits}`,
          },
          {
            icon: DollarSign,
            label: t("monthlyRevenue"),
            value: formatCHF(revenue),
            sub: t("combinedTotal"),
          },
          {
            icon: Wrench,
            label: t("pendingRequests"),
            value: cols.pending.length,
            sub: `${requests.length} total`,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              style={{
                padding: "20px",
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
                  <Icon className="w-[16px] h-[16px]" style={{ color: "var(--primary)" }} />
                </div>
                <TrendingUp className="w-4 h-4" style={{ color: "var(--primary)", opacity: 0.5 }} />
              </div>
              <p
                className="text-[11px] font-medium uppercase"
                style={{ color: "var(--muted-foreground)", letterSpacing: "0.05em" }}
              >
                {kpi.label}
              </p>
              <p
                className="text-[22px] font-bold leading-tight mt-0.5"
                style={{ color: "var(--foreground)" }}
              >
                {kpi.value}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {kpi.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Kanban Board ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <KanbanColumn
          icon={Circle}
          title={t("pending")}
          count={cols.pending.length}
          color="#F59E0B"
          requests={cols.pending}
        />
        <KanbanColumn
          icon={Clock}
          title={t("inProgress")}
          count={cols.inProgress.length}
          color="var(--primary)"
          requests={cols.inProgress}
        />
        <KanbanColumn
          icon={CheckCircle2}
          title={t("completed")}
          count={cols.completed.length}
          color="#22C55E"
          requests={cols.completed}
        />
      </div>
    </div>
  );
}

/* ─── Kanban Column ───────────────────────────────────────────── */

function KanbanColumn({
  icon: Icon,
  title,
  count,
  color,
  requests,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color: string;
  requests: MaintenanceRequest[];
}) {
  return (
    <div>
      {/* Column header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 14, padding: "0 2px" }}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <h3
            className="text-[14px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h3>
        </div>
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              padding: "40px 16px",
              borderRadius: 14,
              border: "1px dashed var(--border)",
              background: "var(--card)",
            }}
          >
            <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
              Aucune demande
            </p>
          </div>
        ) : (
          requests.map((req) => <TaskCard key={req.id} request={req} />)
        )}
      </div>
    </div>
  );
}

/* ─── Task Card (kanban card) ─────────────────────────────────── */

function TaskCard({ request }: { request: MaintenanceRequest }) {
  const priority = PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.medium;
  const dateStr = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString("fr-CH", {
        month: "short",
        day: "numeric",
      })
    : "";

  /* progress bar (visual only — estimate based on status) */
  const progressPct =
    request.status === "completed"
      ? 100
      : request.status === "in-progress"
      ? Math.floor(Math.random() * 40 + 30) // 30-70%
      : 0;

  return (
    <div
      className="transition-all cursor-pointer"
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--card)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Title */}
      <h4
        className="text-[14px] font-semibold leading-snug"
        style={{ color: "var(--foreground)" }}
      >
        {request.title}
      </h4>

      {/* Description */}
      <p
        className="text-[12px] leading-relaxed mt-1 line-clamp-2"
        style={{ color: "var(--muted-foreground)" }}
      >
        {request.description || `${request.buildingName} · Apt ${request.unit}`}
      </p>

      {/* Meta row: avatar + date + priority */}
      <div className="flex items-center justify-between mt-3.5">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {request.tenantName
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "?"}
          </div>

          {/* Date */}
          <span
            className="flex items-center gap-1 text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Calendar className="w-3 h-3" />
            {dateStr}
          </span>
        </div>

        {/* Priority badge */}
        <span
          className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: priority.bg, color: priority.fg }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: priority.dot }}
          />
          {priority.label}
        </span>
      </div>

      {/* Progress bar (in-progress only) */}
      {request.status === "in-progress" && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressPct}%`,
                background: "var(--primary)",
              }}
            />
          </div>
          <span
            className="text-[10px] font-medium shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            {progressPct}%
          </span>
        </div>
      )}
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

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* Hero */}
      <div
        className="overflow-hidden flex flex-col lg:flex-row"
        style={{
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--card)",
          marginBottom: 24,
        }}
      >
        <div className="relative lg:w-[50%] min-h-[220px] lg:min-h-[280px]">
          <img
            src={heroPhoto}
            alt={myBuilding?.name ?? ""}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="lg:w-[50%] p-7 flex flex-col justify-center">
          <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            {t("hello")},
          </p>
          <h2
            className="text-[22px] font-bold mt-1"
            style={{ color: "var(--foreground)" }}
          >
            {userName}
          </h2>
          {myBuilding && (
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
              <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                {myBuilding.name} — {myBuilding.address}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        {[
          { icon: Home, label: t("myBuilding"), value: myBuilding?.name ?? "—", sub: myTenant?.unit ? `Apt ${myTenant.unit}` : undefined },
          { icon: DollarSign, label: t("monthlyRent"), value: myTenant ? formatCHF(myTenant.rent) : "—", sub: t("currentAmount") },
          { icon: Wrench, label: t("waiting"), value: pendingCount, sub: t("requests") },
          { icon: AlertCircle, label: t("ongoing"), value: inProgressCount, sub: t("requests") },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              style={{
                padding: 20,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: "var(--sidebar-accent)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
              </div>
              <p
                className="text-[11px] font-medium uppercase"
                style={{ color: "var(--muted-foreground)", letterSpacing: "0.05em" }}
              >
                {kpi.label}
              </p>
              <p className="text-[20px] font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
                {kpi.value}
              </p>
              {kpi.sub && (
                <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {kpi.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Lease */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3
          className="text-[15px] font-semibold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          {t("leaseInfo")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("unit"), value: myTenant?.unit ?? "—" },
            { label: t("address"), value: myBuilding?.address ?? "—" },
            { label: t("leaseStart"), value: myTenant?.leaseStart ? new Date(myTenant.leaseStart).toLocaleDateString("fr-CH") : "—" },
            { label: t("leaseEnd"), value: myTenant?.leaseEnd ? new Date(myTenant.leaseEnd).toLocaleDateString("fr-CH") : "—" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl"
              style={{ padding: "12px 14px", background: "var(--background)", border: "1px solid var(--border)" }}
            >
              <p
                className="text-[10px] font-medium uppercase mb-1"
                style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
              >
                {item.label}
              </p>
              <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent requests */}
      {myRequests.length > 0 && (
        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: 24,
          }}
        >
          <h3
            className="text-[15px] font-semibold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            {t("recentRequests")}
          </h3>
          <div className="space-y-2">
            {myRequests.slice(0, 4).map((req) => {
              const priority = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.medium;
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-4 rounded-xl transition-colors"
                  style={{
                    padding: "12px 14px",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(69,85,58,0.07)" }}
                  >
                    <Wrench className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {req.title}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {req.buildingName} · Apt {req.unit}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: priority.bg, color: priority.fg }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: priority.dot }}
                    />
                    {priority.label}
                  </span>
                </div>
              );
            })}
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
