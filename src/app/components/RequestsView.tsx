import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle,
  Trash2,
  Home,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  X,
  ChevronRight,
  FileText,
  Search,
  AlertTriangle,
  Zap,
  ArrowRight,
  CheckCheck,
  Eye,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getMaintenanceRequests,
  saveMaintenanceRequests,
  getTenants,
  getBuildings,
  getRentalApplications,
  saveRentalApplications,
  type MaintenanceRequest,
  type Building,
  type RentalApplication,
} from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

/* ═══════════════════════════════════════════════════════════════
   STATUS / BADGE SYSTEM
═══════════════════════════════════════════════════════════════ */

type BadgeCfg = { bg: string; fg: string; dot: string };

const MAINT_STATUS: Record<string, BadgeCfg> = {
  pending:      { bg: "rgba(245,158,11,0.10)", fg: "#B45309", dot: "#F59E0B" },
  "in-progress":{ bg: "rgba(59,130,246,0.10)", fg: "#1D4ED8", dot: "#3B82F6" },
  completed:    { bg: "rgba(34,197,94,0.10)",  fg: "#15803D", dot: "#22C55E" },
};

const APP_STATUS: Record<string, BadgeCfg & { label: string }> = {
  received:      { bg: "rgba(99,102,241,0.10)", fg: "#4338CA", dot: "#6366F1", label: "Reçue" },
  "under-review":{ bg: "rgba(245,158,11,0.10)", fg: "#B45309", dot: "#F59E0B", label: "En examen" },
  accepted:      { bg: "rgba(34,197,94,0.10)",  fg: "#15803D", dot: "#22C55E", label: "Acceptée" },
  rejected:      { bg: "rgba(239,68,68,0.10)",  fg: "#DC2626", dot: "#EF4444", label: "Refusée" },
};

const PRIORITY: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: "rgba(239,68,68,0.12)", fg: "#DC2626" },
  high:   { bg: "rgba(239,68,68,0.08)", fg: "#B91C1C" },
  medium: { bg: "rgba(245,158,11,0.10)", fg: "#B45309" },
  low:    { bg: "rgba(107,114,128,0.08)", fg: "#4B5563" },
};

function StatusDot({ color }: { color: string }) {
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
  );
}

function MaintBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const c = MAINT_STATUS[status] ?? { bg: "rgba(107,114,128,0.08)", fg: "#4B5563", dot: "#9CA3AF" };
  const label = status === "pending" ? t("pending") : status === "in-progress" ? t("inProgress") : t("completed");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold" style={{ padding: "4px 10px", background: c.bg, color: c.fg }}>
      <StatusDot color={c.dot} />
      {label}
    </span>
  );
}

function AppBadge({ status }: { status: string }) {
  const c = APP_STATUS[status] ?? { bg: "rgba(107,114,128,0.08)", fg: "#4B5563", dot: "#9CA3AF", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold" style={{ padding: "4px 10px", background: c.bg, color: c.fg }}>
      <StatusDot color={c.dot} />
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority, t }: { priority: string; t: (k: string) => string }) {
  const c = PRIORITY[priority] ?? PRIORITY.low;
  const label = priority === "urgent" ? t("urgent") : priority === "high" ? t("high") : priority === "medium" ? t("medium") : t("low");
  return (
    <span className="rounded text-[10px] font-semibold uppercase" style={{ padding: "2px 7px", background: c.bg, color: c.fg, letterSpacing: "0.05em" }}>
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILTER PILL
═══════════════════════════════════════════════════════════════ */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl text-[13px] font-medium transition-all"
      style={{
        padding: "7px 14px",
        background: active ? "var(--primary)" : "var(--card)",
        color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
        border: `1px solid ${active ? "transparent" : "var(--border)"}`,
        boxShadow: active ? "0 1px 4px rgba(69,85,58,0.18)" : "none",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APPLICATION DETAIL DRAWER
═══════════════════════════════════════════════════════════════ */

function ApplicationDrawer({
  app,
  open,
  onClose,
  onStatusChange,
  t,
  formatCHF,
}: {
  app: RentalApplication | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: RentalApplication["status"]) => void;
  t: (k: string) => string;
  formatCHF: (v: number) => string;
}) {
  if (!app) return null;

  const actions: { key: RentalApplication["status"]; label: string; bg: string; fg: string }[] = [
    { key: "under-review", label: t("markUnderReview"), bg: "rgba(245,158,11,0.12)", fg: "#B45309" },
    { key: "accepted",     label: t("approve"),         bg: "rgba(34,197,94,0.12)",  fg: "#15803D" },
    { key: "rejected",     label: t("reject"),          bg: "rgba(239,68,68,0.10)",  fg: "#DC2626" },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.20)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: "min(480px, 100vw)",
          background: "var(--card)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.10)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                {t("reviewApplication")}
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {app.buildingName} · {t("unit")} {app.desiredUnit}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current status + actions */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <AppBadge status={app.status} />
            <div className="flex-1" />
            {actions
              .filter((a) => a.key !== app.status)
              .map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => onStatusChange(app.id, a.key)}
                  className="rounded-lg text-[12px] font-semibold transition-colors"
                  style={{ padding: "5px 12px", background: a.bg, color: a.fg }}
                >
                  {a.label}
                </button>
              ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Identity */}
          <Section title={t("applicantInfo")}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--sidebar-accent)" }}
              >
                <User className="w-5 h-5" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--foreground)" }}>
                  {app.applicantName}
                </p>
                <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                  {app.occupation} · {app.employer}
                </p>
              </div>
            </div>
            <DrawerGrid>
              <DrawerItem icon={<Mail className="w-3.5 h-3.5" />} label={t("email")} value={app.applicantEmail} />
              <DrawerItem icon={<Phone className="w-3.5 h-3.5" />} label={t("phone")} value={app.applicantPhone} />
              <DrawerItem icon={<MapPin className="w-3.5 h-3.5" />} label={t("currentAddress")} value={app.currentAddress} full />
            </DrawerGrid>
          </Section>

          {/* Application details */}
          <Section title={t("applicationDetails")}>
            <DrawerGrid>
              <DrawerItem icon={<Calendar className="w-3.5 h-3.5" />} label={t("desiredMoveIn")} value={new Date(app.desiredMoveIn).toLocaleDateString("fr-CH")} />
              <DrawerItem icon={<DollarSign className="w-3.5 h-3.5" />} label={t("monthlyIncome")} value={formatCHF(app.monthlyIncome)} />
              <DrawerItem icon={<Users className="w-3.5 h-3.5" />} label={t("householdSize")} value={`${app.householdSize} ${t("numberOfPersons")}`} />
              <DrawerItem icon={<Calendar className="w-3.5 h-3.5" />} label={t("applicationDate")} value={new Date(app.createdAt).toLocaleDateString("fr-CH")} />
            </DrawerGrid>
          </Section>

          {/* Message */}
          {app.message && (
            <Section title={t("applicationMessage")}>
              <div
                className="rounded-xl p-4 text-[13px] leading-relaxed"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                {app.message}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase mb-3" style={{ color: "var(--muted-foreground)", letterSpacing: "0.1em" }}>
        {title}
      </p>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--card)" }}
      >
        {children}
      </div>
    </div>
  );
}

function DrawerGrid({ children }: { children: React.ReactNode }) {
  return <div className="divide-y" style={{ borderColor: "var(--border)" }}>{children}</div>;
}

function DrawerItem({
  icon,
  label,
  value,
  full,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span style={{ color: "var(--muted-foreground)" }}>{icon}</span>
        <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
          {label}
        </p>
      </div>
      <p className="text-[13px]" style={{ color: "var(--foreground)" }}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */

export function RequestsView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"maintenance" | "applications">("maintenance");
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [applications, setApplications] = useState<RentalApplication[]>([]);

  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [appFilter, setAppFilter] = useState<"all" | "received" | "under-review" | "accepted" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAppDialogOpen, setIsAppDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", priority: "medium" as "low" | "medium" | "high" });
  const [appFormData, setAppFormData] = useState({
    buildingId: "", desiredUnit: "", applicantName: "", applicantEmail: "",
    applicantPhone: "", currentAddress: "", desiredMoveIn: "", monthlyIncome: 0,
    householdSize: 1, occupation: "", employer: "", message: "",
  });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    const all = getMaintenanceRequests();
    setRequests(isAdmin ? all : all.filter((r) => r.tenantId === user?.id));
    setTenants(getTenants());
    setBuildings(getBuildings());
    setApplications(getRentalApplications());
  };

  const filteredRequests = useMemo(() => {
    let list = requests.filter((r) => filter === "all" || r.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.tenantName.toLowerCase().includes(q) ||
        r.buildingName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, filter, searchQuery]);

  const filteredApplications = useMemo(
    () => applications.filter((a) => appFilter === "all" || a.status === appFilter),
    [applications, appFilter]
  );

  const drawerApp = useMemo(
    () => (drawerAppId ? applications.find((a) => a.id === drawerAppId) ?? null : null),
    [applications, drawerAppId]
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in-progress").length;
  const receivedCount = applications.filter((a) => a.status === "received").length;
  const reviewCount = applications.filter((a) => a.status === "under-review").length;

  const formatCHF = (v: number) => {
    const n = Number.isFinite(v) ? v : 0;
    return `CHF ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-CH", { year: "numeric", month: "short", day: "numeric" });

  /* ── Handlers ── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      const tenant = tenants.find((tn: any) => tn.email === user?.email);
      if (!tenant) return;
      const req: MaintenanceRequest = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        buildingId: tenant.buildingId,
        buildingName: tenant.buildingName,
        unit: tenant.unit,
        tenantId: user!.id,
        tenantName: user!.name,
        status: "pending",
        priority: formData.priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveMaintenanceRequests([...getMaintenanceRequests(), req]);
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", priority: "medium" });
      loadData();
    }
  };

  const handleStatusChange = (id: string, status: MaintenanceRequest["status"]) => {
    const all = getMaintenanceRequests();
    saveMaintenanceRequests(all.map((r) => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r));
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteRequest"))) {
      saveMaintenanceRequests(getMaintenanceRequests().filter((r) => r.id !== id));
      loadData();
    }
  };

  const handleAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bldg = buildings.find((b) => b.id === appFormData.buildingId);
    if (!bldg) return;
    const apps = getRentalApplications();
    saveRentalApplications([{
      id: `ra-${Date.now()}`,
      buildingId: appFormData.buildingId,
      buildingName: bldg.name,
      desiredUnit: appFormData.desiredUnit,
      applicantName: appFormData.applicantName,
      applicantEmail: appFormData.applicantEmail,
      applicantPhone: appFormData.applicantPhone,
      currentAddress: appFormData.currentAddress,
      desiredMoveIn: appFormData.desiredMoveIn,
      monthlyIncome: Number(appFormData.monthlyIncome) || 0,
      householdSize: Number(appFormData.householdSize) || 1,
      occupation: appFormData.occupation,
      employer: appFormData.employer,
      message: appFormData.message,
      status: "received",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, ...apps]);
    setIsAppDialogOpen(false);
    setAppFormData({ buildingId: "", desiredUnit: "", applicantName: "", applicantEmail: "", applicantPhone: "", currentAddress: "", desiredMoveIn: "", monthlyIncome: 0, householdSize: 1, occupation: "", employer: "", message: "" });
    loadData();
  };

  const handleAppStatusChange = (id: string, status: RentalApplication["status"]) => {
    const apps = getRentalApplications();
    saveRentalApplications(apps.map((a) => a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a));
    loadData();
  };

  const handleAppDelete = (id: string) => {
    if (confirm(t("confirmDeleteRequest"))) {
      saveRentalApplications(getRentalApplications().filter((a) => a.id !== id));
      if (drawerAppId === id) setDrawerAppId(null);
      loadData();
    }
  };

  /* ── Maintenance status icon ── */
  const statusIcon = (s: string) => {
    if (s === "pending")     return <Clock className="w-4 h-4" />;
    if (s === "in-progress") return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>

      {/* ── Page header ───────────────────────────────────── */}
      <div
        className="sticky top-0 z-30"
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                {isAdmin ? t("requestsHub") : t("myRequestsTitle")}
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {isAdmin ? t("requestsHubSub") : t("requestsSubTenant")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search (maintenance tab only) */}
              {activeTab === "maintenance" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("search") + "..."}
                    className="text-[13px] outline-none transition-all"
                    style={{
                      padding: "8px 14px 8px 34px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                      width: 200,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                </div>
              )}

              {/* Add buttons */}
              {activeTab === "maintenance" && !isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-xl text-[13px] font-semibold transition-opacity"
                      style={{ padding: "8px 16px", background: "var(--primary)", color: "var(--primary-foreground)" }}
                    >
                      <Plus className="w-4 h-4" />
                      {t("newRequest")}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl max-w-md" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <DialogHeader>
                      <DialogTitle style={{ color: "var(--foreground)" }}>{t("newRequest")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label style={{ color: "var(--foreground)" }}>{t("requestTitle")}</Label>
                        <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                      </div>
                      <div>
                        <Label style={{ color: "var(--foreground)" }}>{t("requestDescription")}</Label>
                        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4} className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                      </div>
                      <div>
                        <Label style={{ color: "var(--foreground)" }}>{t("priority")}</Label>
                        <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                          <SelectTrigger className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{t("low")}</SelectItem>
                            <SelectItem value="medium">{t("medium")}</SelectItem>
                            <SelectItem value="high">{t("high")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="submit" className="flex-1 rounded-xl text-[13px] font-semibold py-2.5 transition-opacity" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>{t("submit")}</button>
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl text-[13px] font-medium py-2.5" style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "var(--background)" }}>{t("cancel")}</button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {activeTab === "applications" && isAdmin && (
                <Dialog open={isAppDialogOpen} onOpenChange={setIsAppDialogOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="flex items-center gap-2 rounded-xl text-[13px] font-semibold transition-opacity" style={{ padding: "8px 16px", background: "var(--primary)", color: "var(--primary-foreground)" }}>
                      <Plus className="w-4 h-4" />
                      {t("newRentalApplication")}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <DialogHeader>
                      <DialogTitle style={{ color: "var(--foreground)" }}>{t("newRentalApplication")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAppSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label style={{ color: "var(--foreground)" }}>{t("applicantName")}</Label>
                        <Input value={appFormData.applicantName} onChange={(e) => setAppFormData({ ...appFormData, applicantName: e.target.value })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("applicantEmail")}</Label>
                          <Input type="email" value={appFormData.applicantEmail} onChange={(e) => setAppFormData({ ...appFormData, applicantEmail: e.target.value })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("applicantPhone")}</Label>
                          <Input value={appFormData.applicantPhone} onChange={(e) => setAppFormData({ ...appFormData, applicantPhone: e.target.value })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                      </div>
                      <div>
                        <Label style={{ color: "var(--foreground)" }}>{t("building")}</Label>
                        <Select value={appFormData.buildingId} onValueChange={(v) => setAppFormData({ ...appFormData, buildingId: v })}>
                          <SelectTrigger className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}><SelectValue placeholder={t("selectBuilding")} /></SelectTrigger>
                          <SelectContent>
                            {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("desiredUnit")}</Label>
                          <Input value={appFormData.desiredUnit} onChange={(e) => setAppFormData({ ...appFormData, desiredUnit: e.target.value })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("desiredMoveIn")}</Label>
                          <Input type="date" value={appFormData.desiredMoveIn} onChange={(e) => setAppFormData({ ...appFormData, desiredMoveIn: e.target.value })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("monthlyIncome")}</Label>
                          <Input type="number" value={appFormData.monthlyIncome} onChange={(e) => setAppFormData({ ...appFormData, monthlyIncome: parseInt(e.target.value) || 0 })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("householdSize")}</Label>
                          <Input type="number" min={1} value={appFormData.householdSize} onChange={(e) => setAppFormData({ ...appFormData, householdSize: parseInt(e.target.value) || 1 })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("applicantOccupation")}</Label>
                          <Input value={appFormData.occupation} onChange={(e) => setAppFormData({ ...appFormData, occupation: e.target.value })} className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("employer")}</Label>
                          <Input value={appFormData.employer} onChange={(e) => setAppFormData({ ...appFormData, employer: e.target.value })} className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                        <div>
                          <Label style={{ color: "var(--foreground)" }}>{t("currentAddress")}</Label>
                          <Input value={appFormData.currentAddress} onChange={(e) => setAppFormData({ ...appFormData, currentAddress: e.target.value })} required className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                        </div>
                      </div>
                      <div>
                        <Label style={{ color: "var(--foreground)" }}>{t("applicationMessage")}</Label>
                        <Textarea value={appFormData.message} onChange={(e) => setAppFormData({ ...appFormData, message: e.target.value })} rows={3} className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="submit" className="flex-1 rounded-xl text-[13px] font-semibold py-2.5" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>{t("create")}</button>
                        <button type="button" onClick={() => setIsAppDialogOpen(false)} className="flex-1 rounded-xl text-[13px] font-medium py-2.5" style={{ border: "1px solid var(--border)", color: "var(--foreground)", background: "var(--background)" }}>{t("cancel")}</button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Tabs (admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-5">
              {[
                { key: "maintenance", icon: Wrench, label: t("maintenanceTab"), badge: pendingCount },
                { key: "applications", icon: FileText, label: t("rentalApplicationsTab"), badge: receivedCount },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key as any;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    className="flex items-center gap-2 rounded-xl text-[13px] font-medium transition-all"
                    style={{
                      padding: "8px 16px",
                      background: isActive ? "var(--primary)" : "transparent",
                      color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      boxShadow: isActive ? "0 1px 4px rgba(69,85,58,0.18)" : "none",
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--foreground)"; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; } }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.badge > 0 && (
                      <span
                        className="rounded-full text-[10px] font-bold"
                        style={{
                          padding: "1px 6px",
                          background: isActive ? "rgba(255,255,255,0.22)" : "rgba(245,158,11,0.15)",
                          color: isActive ? "#fff" : "#B45309",
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-8 py-6">

        {/* ═══ MAINTENANCE TAB ═══ */}
        {activeTab === "maintenance" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all",         label: t("filterAll") },
                { key: "pending",     label: t("filterPending"),    count: pendingCount },
                { key: "in-progress", label: t("filterInProgress"), count: inProgressCount },
                { key: "completed",   label: t("filterCompleted") },
              ] as const).map((f) => (
                <FilterPill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}
                  {(f as any).count > 0 && (
                    <span
                      className="rounded-full text-[10px] font-bold"
                      style={{
                        padding: "1px 6px",
                        background: filter === f.key ? "rgba(255,255,255,0.22)" : "rgba(245,158,11,0.15)",
                        color: filter === f.key ? "#fff" : "#B45309",
                      }}
                    >
                      {(f as any).count}
                    </span>
                  )}
                </FilterPill>
              ))}
            </div>

            {/* Request cards */}
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const sc = MAINT_STATUS[req.status] ?? MAINT_STATUS.pending;
                return (
                  <div
                    key={req.id}
                    className="group rounded-2xl p-5 transition-all"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(69,85,58,0.25)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Status icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: sc.bg, color: sc.fg }}
                      >
                        {statusIcon(req.status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className="text-[14px] font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                            {req.title}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <PriorityBadge priority={req.priority} t={t} />
                            <MaintBadge status={req.status} t={t} />
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[13px] mb-3 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                          {req.description}
                        </p>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
                          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                            <Home className="w-3.5 h-3.5" />
                            {req.buildingName} · {t("unit")} {req.unit}
                          </span>
                          {isAdmin && (
                            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                              <User className="w-3.5 h-3.5" />
                              {req.tenantName}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(req.createdAt)}
                          </span>
                        </div>

                        {/* Admin status actions */}
                        {isAdmin && (
                          <div className="flex flex-wrap gap-2">
                            {(["pending", "in-progress", "completed"] as const).map((s) => {
                              const sc2 = MAINT_STATUS[s];
                              const isActive = req.status === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleStatusChange(req.id, s)}
                                  disabled={isActive}
                                  className="flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all"
                                  style={{
                                    padding: "5px 10px",
                                    background: isActive ? sc2.bg : "var(--background)",
                                    color: isActive ? sc2.fg : "var(--muted-foreground)",
                                    border: `1px solid ${isActive ? "transparent" : "var(--border)"}`,
                                    cursor: isActive ? "default" : "pointer",
                                  }}
                                >
                                  <StatusDot color={isActive ? sc2.dot : "var(--muted-foreground)"} />
                                  {s === "pending" ? t("pending") : s === "in-progress" ? t("inProgress") : t("completed")}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(req.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
                        style={{ color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#DC2626"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredRequests.length === 0 && (
              <div
                className="rounded-2xl p-14 text-center"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-[14px] font-semibold" style={{ color: "var(--foreground)" }}>{t("noRequests")}</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {filter === "all" ? (isAdmin ? t("noRequestsAdmin") : t("noRequestsTenant")) : t("noRequestsFilter")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ APPLICATIONS TAB ═══ */}
        {activeTab === "applications" && isAdmin && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all",          label: t("filterAll") },
                { key: "received",     label: t("received"),    count: receivedCount },
                { key: "under-review", label: t("underReview"), count: reviewCount },
                { key: "accepted",     label: t("accepted") },
                { key: "rejected",     label: t("rejected") },
              ] as const).map((f) => (
                <FilterPill key={f.key} active={appFilter === f.key} onClick={() => setAppFilter(f.key)}>
                  {f.label}
                  {(f as any).count > 0 && (
                    <span className="rounded-full text-[10px] font-bold" style={{ padding: "1px 6px", background: appFilter === f.key ? "rgba(255,255,255,0.22)" : "rgba(99,102,241,0.12)", color: appFilter === f.key ? "#fff" : "#4338CA" }}>
                      {(f as any).count}
                    </span>
                  )}
                </FilterPill>
              ))}
            </div>

            {/* Application cards */}
            <div className="space-y-3">
              {filteredApplications.map((app) => {
                const sc = APP_STATUS[app.status];
                return (
                  <div
                    key={app.id}
                    className="group rounded-2xl overflow-hidden transition-all cursor-pointer"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                    onClick={() => setDrawerAppId(app.id)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(69,85,58,0.25)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)"; }}
                  >
                    {/* Status accent bar */}
                    <div className="h-1 w-full" style={{ background: sc?.dot ?? "var(--border)" }} />

                    <div className="p-5">
                      {/* 3-column grid layout */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">

                        {/* LEFT: Identity */}
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-bold"
                            style={{ background: "var(--sidebar-accent)", color: "var(--primary)" }}
                          >
                            {app.applicantName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                              {app.applicantName}
                            </p>
                            <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                              {app.occupation}
                            </p>
                            <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                              {app.employer}
                            </p>
                            <div className="mt-2">
                              <AppBadge status={app.status} />
                            </div>
                          </div>
                        </div>

                        {/* CENTER: Property + financials */}
                        <div className="space-y-2.5">
                          <div>
                            <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                              Bien
                            </p>
                            <div className="flex items-center gap-1.5">
                              <Home className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                              <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
                                {app.buildingName}
                              </p>
                            </div>
                            <p className="text-[12px] mt-0.5 ml-5" style={{ color: "var(--muted-foreground)" }}>
                              {t("unit")} {app.desiredUnit}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                              Revenu mensuel
                            </p>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                              <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                                {formatCHF(app.monthlyIncome)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: Dates, household, actions */}
                        <div className="flex flex-col justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                              <div>
                                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Entrée souhaitée</p>
                                <p className="text-[12px] font-medium" style={{ color: "var(--foreground)" }}>
                                  {new Date(app.desiredMoveIn).toLocaleDateString("fr-CH")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                              <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                                {app.householdSize} {t("numberOfPersons")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                              <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                                {t("applicationDate")}: {formatDate(app.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Quick actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDrawerAppId(app.id); }}
                              className="flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                              style={{ padding: "5px 10px", background: "var(--sidebar-accent)", color: "var(--primary)" }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Dossier
                            </button>
                            {app.status !== "accepted" && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAppStatusChange(app.id, "accepted"); }}
                                className="flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                                style={{ padding: "5px 10px", background: "rgba(34,197,94,0.10)", color: "#15803D" }}
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                {t("approve")}
                              </button>
                            )}
                            {app.status !== "rejected" && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAppStatusChange(app.id, "rejected"); }}
                                className="flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                                style={{ padding: "5px 10px", background: "rgba(239,68,68,0.08)", color: "#DC2626" }}
                              >
                                <X className="w-3.5 h-3.5" />
                                {t("reject")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleAppDelete(app.id); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ml-auto"
                              style={{ color: "var(--muted-foreground)" }}
                              onMouseEnter={(e2) => { e2.currentTarget.style.background = "rgba(239,68,68,0.08)"; e2.currentTarget.style.color = "#DC2626"; }}
                              onMouseLeave={(e2) => { e2.currentTarget.style.background = "transparent"; e2.currentTarget.style.color = "var(--muted-foreground)"; }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredApplications.length === 0 && (
              <div
                className="rounded-2xl p-14 text-center"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-[14px] font-semibold" style={{ color: "var(--foreground)" }}>{t("noApplications")}</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>{t("noApplicationsSub")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Application drawer */}
      <ApplicationDrawer
        app={drawerApp}
        open={!!drawerAppId}
        onClose={() => setDrawerAppId(null)}
        onStatusChange={handleAppStatusChange}
        t={t}
        formatCHF={formatCHF}
      />
    </div>
  );
}
