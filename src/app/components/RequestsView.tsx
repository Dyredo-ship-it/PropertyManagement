import { cn } from "./ui/utils";
import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Home,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  MessageSquare,
  X,
  ChevronRight,
  Eye,
  FileText,
  Search,
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

// ─────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────

function MaintenanceStatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const cfg = {
    pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    "in-progress": { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    completed: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  }[status] ?? { bg: "bg-slate-100 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" };

  const label = status === "pending" ? t("pending") : status === "in-progress" ? t("inProgress") : t("completed");

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}

function ApplicationStatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const cfg = {
    received: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    "under-review": { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    accepted: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    rejected: { bg: "bg-red-50 border-red-200", text: "text-red-600", dot: "bg-red-500" },
  }[status] ?? { bg: "bg-slate-100 border-slate-200", text: "text-slate-600", dot: "bg-slate-400" };

  const label = status === "received" ? t("received") : status === "under-review" ? t("underReview") : status === "accepted" ? t("accepted") : t("rejected");

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}

function PriorityBadge({ priority, t }: { priority: string; t: (k: string) => string }) {
  const cfg = {
    high: { bg: "bg-red-50 border-red-200", text: "text-red-700" },
    urgent: { bg: "bg-red-100 border-red-300", text: "text-red-800" },
    medium: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
    low: { bg: "bg-slate-50 border-slate-200", text: "text-slate-600" },
  }[priority] ?? { bg: "bg-slate-50 border-slate-200", text: "text-slate-600" };

  const label = priority === "high" ? t("high") : priority === "urgent" ? t("urgent") : priority === "medium" ? t("medium") : t("low");

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border", cfg.bg, cfg.text)}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────
// Rental Application Detail Drawer
// ─────────────────────────────────────────

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

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-xl bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{t("reviewApplication")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {app.buildingName} &middot; {t("unit")} {app.desiredUnit}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-xl transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Status actions */}
          <div className="flex items-center gap-2 mt-4">
            <ApplicationStatusBadge status={app.status} t={t} />
            <div className="flex-1" />
            {app.status !== "accepted" && (
              <button
                onClick={() => onStatusChange(app.id, "accepted")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
              >
                {t("approve")}
              </button>
            )}
            {app.status !== "under-review" && app.status !== "accepted" && app.status !== "rejected" && (
              <button
                onClick={() => onStatusChange(app.id, "under-review")}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
              >
                {t("markUnderReview")}
              </button>
            )}
            {app.status !== "rejected" && (
              <button
                onClick={() => onStatusChange(app.id, "rejected")}
                className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
              >
                {t("reject")}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Applicant info */}
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{t("applicantInfo")}</h3>
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{app.applicantName}</p>
                  <p className="text-sm text-muted-foreground">{app.occupation} &middot; {app.employer}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t("email")}</span>
                  </div>
                  <p className="text-sm text-foreground">{app.applicantEmail}</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t("phone")}</span>
                  </div>
                  <p className="text-sm text-foreground">{app.applicantPhone}</p>
                </div>
              </div>
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t("currentAddress")}</span>
                </div>
                <p className="text-sm text-foreground">{app.currentAddress}</p>
              </div>
            </div>
          </section>

          {/* Application details */}
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{t("applicationDetails")}</h3>
            <div className="rounded-2xl border border-border p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("desiredMoveIn")}</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(app.desiredMoveIn).toLocaleDateString("fr-CH")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("monthlyIncome")}</p>
                  <p className="text-sm font-medium text-foreground">{formatCHF(app.monthlyIncome)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("householdSize")}</p>
                  <p className="text-sm font-medium text-foreground">{app.householdSize} {t("numberOfPersons")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("applicationDate")}</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(app.createdAt).toLocaleDateString("fr-CH")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Message */}
          {app.message && (
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{t("applicationMessage")}</h3>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{app.message}</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────
// Main RequestsView
// ─────────────────────────────────────────

export function RequestsView() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"maintenance" | "applications">("maintenance");

  // Maintenance state
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  // Rental applications state
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [appFilter, setAppFilter] = useState<"all" | "received" | "under-review" | "accepted" | "rejected">("all");
  const [isAppDialogOpen, setIsAppDialogOpen] = useState(false);
  const [drawerAppId, setDrawerAppId] = useState<string | null>(null);

  const [appFormData, setAppFormData] = useState({
    buildingId: "",
    desiredUnit: "",
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    currentAddress: "",
    desiredMoveIn: "",
    monthlyIncome: 0,
    householdSize: 1,
    occupation: "",
    employer: "",
    message: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allRequests = getMaintenanceRequests();
    if (user?.role === "tenant") {
      setRequests(allRequests.filter((r) => r.tenantId === user.id));
    } else {
      setRequests(allRequests);
    }
    setTenants(getTenants());
    setBuildings(getBuildings());
    setApplications(getRentalApplications());
  };

  // Maintenance filtered
  const filteredRequests = useMemo(() => {
    let list = requests.filter((r) => filter === "all" || r.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.tenantName.toLowerCase().includes(q) ||
          r.buildingName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, filter, searchQuery]);

  // Applications filtered
  const filteredApplications = useMemo(() => {
    return applications.filter((a) => appFilter === "all" || a.status === appFilter);
  }, [applications, appFilter]);

  const drawerApp = useMemo(() => {
    if (!drawerAppId) return null;
    return applications.find((a) => a.id === drawerAppId) ?? null;
  }, [applications, drawerAppId]);

  // Maintenance counts
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in-progress").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;

  // Application counts
  const receivedCount = applications.filter((a) => a.status === "received").length;
  const reviewCount = applications.filter((a) => a.status === "under-review").length;

  const formatCHF = (value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    const s = Math.round(n).toString();
    return `CHF ${s.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`;
  };

  // Maintenance handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "tenant") return;
    const tenant = tenants.find((tn: any) => tn.email === user.email);
    if (!tenant) return;

    const newRequest: MaintenanceRequest = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      buildingId: tenant.buildingId,
      buildingName: tenant.buildingName,
      unit: tenant.unit,
      tenantId: user.id,
      tenantName: user.name,
      status: "pending",
      priority: formData.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allRequests = getMaintenanceRequests();
    saveMaintenanceRequests([...allRequests, newRequest]);
    setIsDialogOpen(false);
    setFormData({ title: "", description: "", priority: "medium" });
    loadData();
  };

  const handleStatusChange = (id: string, newStatus: MaintenanceRequest["status"]) => {
    const allRequests = getMaintenanceRequests();
    const updated = allRequests.map((r) =>
      r.id === id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r
    );
    saveMaintenanceRequests(updated);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteRequest"))) {
      const allRequests = getMaintenanceRequests();
      saveMaintenanceRequests(allRequests.filter((r) => r.id !== id));
      loadData();
    }
  };

  // Application handlers
  const handleAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bldg = buildings.find((b) => b.id === appFormData.buildingId);
    if (!bldg) return;

    const apps = getRentalApplications();
    const newApp: RentalApplication = {
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
    };

    saveRentalApplications([newApp, ...apps]);
    setIsAppDialogOpen(false);
    setAppFormData({
      buildingId: "", desiredUnit: "", applicantName: "", applicantEmail: "",
      applicantPhone: "", currentAddress: "", desiredMoveIn: "", monthlyIncome: 0,
      householdSize: 1, occupation: "", employer: "", message: "",
    });
    loadData();
  };

  const handleAppStatusChange = (id: string, newStatus: RentalApplication["status"]) => {
    const apps = getRentalApplications();
    const updated = apps.map((a) =>
      a.id === id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a
    );
    saveRentalApplications(updated);
    loadData();
  };

  const handleAppDelete = (id: string) => {
    if (confirm(t("confirmDeleteRequest"))) {
      const apps = getRentalApplications();
      saveRentalApplications(apps.filter((a) => a.id !== id));
      if (drawerAppId === id) setDrawerAppId(null);
      loadData();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-CH", { year: "numeric", month: "short", day: "numeric" });
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isAdmin ? t("requestsHub") : t("myRequestsTitle")}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAdmin ? t("requestsHubSub") : t("requestsSubTenant")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("search") + "..."}
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 w-56 transition-all"
                />
              </div>

              {/* Add buttons */}
              {activeTab === "maintenance" && user?.role === "tenant" && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-5 shadow-sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("newRequest")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">{t("newRequest")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label className="text-foreground">{t("requestTitle")}</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          className="bg-background border-border text-foreground mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-foreground">{t("requestDescription")}</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                          rows={5}
                          className="bg-background border-border text-foreground mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-foreground">{t("priority")}</Label>
                        <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                          <SelectTrigger className="bg-background border-border text-foreground mt-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{t("low")}</SelectItem>
                            <SelectItem value="medium">{t("medium")}</SelectItem>
                            <SelectItem value="high">{t("high")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("submit")}</Button>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 border-border text-foreground">{t("cancel")}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {activeTab === "applications" && isAdmin && (
                <Dialog open={isAppDialogOpen} onOpenChange={setIsAppDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-5 shadow-sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("newRentalApplication")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">{t("newRentalApplication")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAppSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label className="text-foreground">{t("applicantName")}</Label>
                        <Input value={appFormData.applicantName} onChange={(e) => setAppFormData({ ...appFormData, applicantName: e.target.value })} required className="bg-background border-border text-foreground mt-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-foreground">{t("applicantEmail")}</Label>
                          <Input type="email" value={appFormData.applicantEmail} onChange={(e) => setAppFormData({ ...appFormData, applicantEmail: e.target.value })} required className="bg-background border-border text-foreground mt-2" />
                        </div>
                        <div>
                          <Label className="text-foreground">{t("applicantPhone")}</Label>
                          <Input value={appFormData.applicantPhone} onChange={(e) => setAppFormData({ ...appFormData, applicantPhone: e.target.value })} required className="bg-background border-border text-foreground mt-2" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-foreground">{t("building")}</Label>
                        <Select value={appFormData.buildingId} onValueChange={(v) => setAppFormData({ ...appFormData, buildingId: v })}>
                          <SelectTrigger className="bg-background border-border text-foreground mt-2"><SelectValue placeholder={t("selectBuilding")} /></SelectTrigger>
                          <SelectContent>
                            {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-foreground">{t("desiredUnit")}</Label>
                          <Input value={appFormData.desiredUnit} onChange={(e) => setAppFormData({ ...appFormData, desiredUnit: e.target.value })} required className="bg-background border-border text-foreground mt-2" />
                        </div>
                        <div>
                          <Label className="text-foreground">{t("desiredMoveIn")}</Label>
                          <Input type="date" value={appFormData.desiredMoveIn} onChange={(e) => setAppFormData({ ...appFormData, desiredMoveIn: e.target.value })} required className="bg-background border-border text-foreground mt-2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-foreground">{t("monthlyIncome")}</Label>
                          <Input type="number" value={appFormData.monthlyIncome} onChange={(e) => setAppFormData({ ...appFormData, monthlyIncome: parseInt(e.target.value) || 0 })} required className="bg-background border-border text-foreground mt-2" />
                        </div>
                        <div>
                          <Label className="text-foreground">{t("householdSize")}</Label>
                          <Input type="number" min={1} value={appFormData.householdSize} onChange={(e) => setAppFormData({ ...appFormData, householdSize: parseInt(e.target.value) || 1 })} required className="bg-background border-border text-foreground mt-2" />
                        </div>
                        <div>
                          <Label className="text-foreground">{t("applicantOccupation")}</Label>
                          <Input value={appFormData.occupation} onChange={(e) => setAppFormData({ ...appFormData, occupation: e.target.value })} className="bg-background border-border text-foreground mt-2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-foreground">{t("employer")}</Label>
                          <Input value={appFormData.employer} onChange={(e) => setAppFormData({ ...appFormData, employer: e.target.value })} className="bg-background border-border text-foreground mt-2" />
                        </div>
                        <div>
                          <Label className="text-foreground">{t("currentAddress")}</Label>
                          <Input value={appFormData.currentAddress} onChange={(e) => setAppFormData({ ...appFormData, currentAddress: e.target.value })} required className="bg-background border-border text-foreground mt-2" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-foreground">{t("applicationMessage")}</Label>
                        <Textarea value={appFormData.message} onChange={(e) => setAppFormData({ ...appFormData, message: e.target.value })} rows={3} className="bg-background border-border text-foreground mt-2" />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("create")}</Button>
                        <Button type="button" variant="outline" onClick={() => setIsAppDialogOpen(false)} className="flex-1 border-border text-foreground">{t("cancel")}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Tabs - only show for admin */}
          {isAdmin && (
            <div className="flex items-center gap-1 mt-5">
              <button
                onClick={() => setActiveTab("maintenance")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  activeTab === "maintenance"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Wrench className="w-4 h-4" />
                {t("maintenanceTab")}
                {pendingCount > 0 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    activeTab === "maintenance" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                  )}>
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("applications")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  activeTab === "applications"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <FileText className="w-4 h-4" />
                {t("rentalApplicationsTab")}
                {receivedCount > 0 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    activeTab === "applications" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                  )}>
                    {receivedCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 lg:px-8 py-6">
        {/* ═══════════════ MAINTENANCE TAB ═══════════════ */}
        {activeTab === "maintenance" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-2">
              {(["all", "pending", "in-progress", "completed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                    filter === f
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {f === "all" ? t("filterAll") : f === "pending" ? t("filterPending") : f === "in-progress" ? t("filterInProgress") : t("filterCompleted")}
                  {f === "pending" && pendingCount > 0 && (
                    <span className="ml-1.5 text-xs opacity-80">{pendingCount}</span>
                  )}
                  {f === "in-progress" && inProgressCount > 0 && (
                    <span className="ml-1.5 text-xs opacity-80">{inProgressCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Request cards */}
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl bg-card border border-border p-5 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      request.status === "pending" ? "bg-amber-50 text-amber-600" :
                      request.status === "in-progress" ? "bg-blue-50 text-blue-600" :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      {request.status === "pending" ? <Clock className="w-5 h-5" /> :
                       request.status === "in-progress" ? <AlertCircle className="w-5 h-5" /> :
                       <CheckCircle className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-foreground">{request.title}</h3>
                        <MaintenanceStatusBadge status={request.status} t={t} />
                        <PriorityBadge priority={request.priority} t={t} />
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                        {request.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Home className="w-3.5 h-3.5" />
                          {request.buildingName} &middot; {t("unit")} {request.unit}
                        </span>
                        {isAdmin && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {request.tenantName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(request.createdAt)}
                        </span>
                      </div>

                      {isAdmin && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(["pending", "in-progress", "completed"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(request.id, s)}
                              disabled={request.status === s}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                request.status === s
                                  ? "bg-muted/50 text-muted-foreground border-border cursor-default"
                                  : "bg-card border-border text-foreground hover:bg-muted/50"
                              )}
                            >
                              {s === "pending" ? t("pending") : s === "in-progress" ? t("inProgress") : t("completed")}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(request.id)}
                      className="p-2 rounded-lg transition-colors hover:bg-red-50 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredRequests.length === 0 && (
              <div className="text-center py-16 rounded-2xl bg-card border border-border">
                <Wrench className="w-12 h-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("noRequests")}</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === "all"
                    ? isAdmin ? t("noRequestsAdmin") : t("noRequestsTenant")
                    : t("noRequestsFilter")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ RENTAL APPLICATIONS TAB ═══════════════ */}
        {activeTab === "applications" && isAdmin && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-2">
              {(["all", "received", "under-review", "accepted", "rejected"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setAppFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                    appFilter === f
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {f === "all" ? t("filterAll") : f === "received" ? t("received") : f === "under-review" ? t("underReview") : f === "accepted" ? t("accepted") : t("rejected")}
                  {f === "received" && receivedCount > 0 && <span className="ml-1.5 text-xs opacity-80">{receivedCount}</span>}
                  {f === "under-review" && reviewCount > 0 && <span className="ml-1.5 text-xs opacity-80">{reviewCount}</span>}
                </button>
              ))}
            </div>

            {/* Application cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl bg-card border border-border p-5 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setDrawerAppId(app.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{app.applicantName}</h3>
                        <p className="text-xs text-muted-foreground">{app.occupation}</p>
                      </div>
                    </div>
                    <ApplicationStatusBadge status={app.status} t={t} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {app.buildingName} &middot; {t("unit")} {app.desiredUnit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(app.desiredMoveIn).toLocaleDateString("fr-CH")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{formatCHF(app.monthlyIncome)}/mois</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{app.householdSize} {t("numberOfPersons")}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {t("applicationDate")}: {formatDate(app.createdAt)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {t("reviewApplication")}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredApplications.length === 0 && (
              <div className="text-center py-16 rounded-2xl bg-card border border-border">
                <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("noApplications")}</h3>
                <p className="text-sm text-muted-foreground">{t("noApplicationsSub")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Application detail drawer */}
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
