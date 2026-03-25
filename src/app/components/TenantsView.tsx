import { cn } from "./ui/utils";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  Calendar,
  Edit,
  Trash2,
  Send,
  FileText,
  Paperclip,
  Download,
  X,
  Search,
  ChevronRight,
  MapPin,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  MoreHorizontal,
  ExternalLink,
  Home,
  Upload,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
  getTenants,
  saveTenants,
  getBuildings,
  getMaintenanceRequests,
  getNotifications,
  saveNotifications,
  type Tenant,
  type Building,
  type MaintenanceRequest,
  type Notification,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Types ─── */

type TenantNote = {
  id: string;
  date: string;
  text: string;
  createdAt: string;
};

type TenantDocument = {
  id: string;
  category:
    | "Assurance ménage"
    | "Contrat de bail"
    | "Carte d'identité"
    | "Casier des poursuites"
    | "Fiches salaires"
    | "Communication"
    | "Autre";
  filename: string;
  mimeType: string;
  uploadedAt: string;
  dataUrl: string;
};

const DOC_CATEGORIES: TenantDocument["category"][] = [
  "Assurance ménage",
  "Contrat de bail",
  "Carte d'identité",
  "Casier des poursuites",
  "Fiches salaires",
  "Communication",
  "Autre",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });

/* ─── Premium building images ─── */

const BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=500&fit=crop&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=500&fit=crop&q=80",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=900&h=500&fit=crop&q=80",
  "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=900&h=500&fit=crop&q=80",
  "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=900&h=500&fit=crop&q=80",
];

/* ─── Helpers ─── */

const formatCHF = (value: number) => {
  const n = Number.isFinite(value) ? value : 0;
  return `CHF ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/* ─── StatusDot ─── */

function StatusDot({ status, t, showLabel = true }: { status: string; t: (k: string) => string; showLabel?: boolean }) {
  const cfg: Record<string, { dot: string; label: string }> = {
    active: { dot: "bg-emerald-400", label: t("active") },
    pending: { dot: "bg-amber-400", label: t("pending") },
    ended: { dot: "bg-slate-400", label: t("ended") },
  };
  const c = cfg[status] ?? cfg.ended;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full ring-2 ring-white/50", c.dot)} />
      {showLabel && <span className="text-[11px] font-medium text-white/90">{c.label}</span>}
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TENANT BUBBLE — frosted glass card inside building
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TenantBubble({
  tenant,
  onClick,
  t,
}: {
  tenant: any;
  onClick: () => void;
  t: (k: string) => string;
}) {
  const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
  const charges = Number(tenant.charges ?? 0) || 0;
  const total = rentNet + charges;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/30"
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <div className="p-4">
        {/* Avatar + Name + Status */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {getInitials(tenant.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-white text-[13px] leading-tight truncate drop-shadow-sm">
              {tenant.name}
            </h4>
            <p className="text-[11px] text-white/60 mt-0.5">
              {t("unit")} {tenant.unit}
            </p>
          </div>
          <StatusDot status={tenant.status} t={t} showLabel={false} />
        </div>

        {/* Rent line */}
        <div className="flex items-center justify-between pt-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
        >
          <span className="text-[10px] uppercase tracking-wider text-white/45 font-medium">
            {t("totalMonthly")}
          </span>
          <span className="text-[13px] font-bold text-white/95 tabular-nums">
            {formatCHF(total)}
          </span>
        </div>

        {/* Hover cue */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[10px] text-white/60 font-medium">{t("viewProfile")}</span>
          <ChevronRight className="w-3 h-3 text-white/50" />
        </div>
      </div>
    </button>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BUILDING CARD — immersive hero image + tenants
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function BuildingCard({
  building,
  tenants,
  index,
  onTenantClick,
  t,
  requests,
}: {
  building: Building;
  tenants: any[];
  index: number;
  onTenantClick: (tenant: any) => void;
  t: (k: string) => string;
  requests: MaintenanceRequest[];
}) {
  const image = BUILDING_IMAGES[index % BUILDING_IMAGES.length];
  const activeTenants = tenants.filter((tn) => tn.status === "active").length;
  const pendingReqs = requests.filter((r) => r.buildingId === building.id && (r.status === "pending" || r.status === "in-progress")).length;
  const totalRevenue = tenants.reduce((sum, tn) => sum + (Number(tn.rentNet ?? 0) || 0) + (Number(tn.charges ?? 0) || 0), 0);
  const occupancyPct = building.units > 0 ? Math.round((activeTenants / building.units) * 100) : 0;

  return (
    <div className="rounded-[28px] overflow-hidden shadow-lg shadow-black/8 group/building">
      {/* ─── Hero section with immersive image ─── */}
      <div className="relative min-h-[320px] lg:min-h-[360px]">
        {/* Background image */}
        <img
          src={image}
          alt={building.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

        {/* Building info — top area */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg tracking-tight">
              {building.name}
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5 text-white/60" />
              <span className="text-sm text-white/70 drop-shadow">{building.address}</span>
            </div>
          </div>

          {/* Pending requests pill */}
          {pendingReqs > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(251, 191, 36, 0.2)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                color: "#FCD34D",
              }}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingReqs} {t("openRequests").toLowerCase()}
            </div>
          )}
        </div>

        {/* ─── Floating metric pills — glassmorphism ─── */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-0">
          {/* Metrics row */}
          <div className="flex flex-wrap gap-3 mb-5">
            {[
              { label: t("tenantCount"), value: String(tenants.length), accent: false },
              { label: t("units"), value: String(building.units), accent: false },
              { label: t("occupancyLabel"), value: `${occupancyPct}%`, accent: true },
              { label: t("revenue"), value: formatCHF(totalRevenue), accent: false },
            ].map((m, i) => (
              <div key={i} className="px-4 py-2.5 rounded-2xl"
                style={{
                  background: m.accent ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <p className={cn(
                  "text-base font-bold tabular-nums",
                  m.accent ? "text-white" : "text-white/95"
                )}>
                  {m.value}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mt-0.5">
                  {m.label}
                </p>
              </div>
            ))}
          </div>

          {/* ─── Tenant bubbles grid ─── */}
          {tenants.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {tenants.map((tenant) => (
                <TenantBubble
                  key={tenant.id}
                  tenant={tenant}
                  onClick={() => onTenantClick(tenant)}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
            >
              <Users className="w-8 h-8 text-white/25 mx-auto mb-2" />
              <p className="text-sm text-white/40">{t("noTenants")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TENANT DETAIL DRAWER — premium slide-out panel
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TenantDetailDrawer({
  tenant,
  open,
  onClose,
  t,
  onEdit,
  onDelete,
  onEmail,
  ficheNotes,
  ficheDocs,
  noteDate,
  setNoteDate,
  noteText,
  setNoteText,
  addNote,
  deleteNote,
  docCategory,
  setDocCategory,
  fileInputRef,
  uploadDoc,
  deleteDoc,
  requests,
}: {
  tenant: any;
  open: boolean;
  onClose: () => void;
  t: (k: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onEmail: () => void;
  ficheNotes: TenantNote[];
  ficheDocs: TenantDocument[];
  noteDate: string;
  setNoteDate: (v: string) => void;
  noteText: string;
  setNoteText: (v: string) => void;
  addNote: () => void;
  deleteNote: (id: string) => void;
  docCategory: TenantDocument["category"];
  setDocCategory: (v: TenantDocument["category"]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadDoc: (file: File) => Promise<void>;
  deleteDoc: (id: string) => void;
  requests: MaintenanceRequest[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "documents">("overview");
  const [showSendDoc, setShowSendDoc] = useState(false);
  const [sendDocFile, setSendDocFile] = useState<File | null>(null);
  const [sendDocCategory, setSendDocCategory] = useState<TenantDocument["category"]>("Communication");
  const [sendDocMessage, setSendDocMessage] = useState("");
  const sendDocFileRef = useRef<HTMLInputElement | null>(null);

  const handleSendDocument = async () => {
    if (!tenant || !sendDocFile) return;
    const dataUrl = await fileToDataUrl(sendDocFile);

    // Store the document in the tenant's documents
    const docEntry: TenantDocument = {
      id: `${Date.now()}`,
      category: sendDocCategory,
      filename: sendDocFile.name,
      mimeType: sendDocFile.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      dataUrl,
    };
    const currentDocs = (tenant.documents ?? []) as TenantDocument[];

    // Also create a notification for the tenant
    const allNotifications = getNotifications();
    const newNotification: Notification = {
      id: `doc-${Date.now()}`,
      title: t("docSentNotifTitle"),
      message: sendDocMessage.trim()
        ? `${sendDocMessage.trim()}\n\n📎 ${sendDocFile.name} (${sendDocCategory})`
        : `${t("docSentNotifMessage")} ${sendDocFile.name} (${sendDocCategory})`,
      date: new Date().toISOString(),
      read: false,
      buildingId: tenant.buildingId,
      recipientId: tenant.id,
    };
    saveNotifications([...allNotifications, newNotification]);

    // Update tenant documents via the parent's update mechanism
    // We use uploadDoc indirectly by dispatching through the existing pattern
    const updatedTenants = getTenants() as any[];
    const updated = updatedTenants.map((tn: any) =>
      tn.id === tenant.id ? { ...tn, documents: [docEntry, ...currentDocs] } : tn
    );
    saveTenants(updated as any);

    // Reset and close
    setSendDocFile(null);
    setSendDocMessage("");
    setSendDocCategory("Communication");
    if (sendDocFileRef.current) sendDocFileRef.current.value = "";
    setShowSendDoc(false);
  };

  if (!tenant) return null;

  const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
  const charges = Number(tenant.charges ?? 0) || 0;
  const total = rentNet + charges;
  const tenantRequests = requests.filter((r) => r.tenantId === tenant.id);
  const openReqs = tenantRequests.filter((r) => r.status === "pending" || r.status === "in-progress");
  const closedReqs = tenantRequests.filter((r) => r.status === "completed");

  const tabs = [
    { key: "overview" as const, label: t("details"), icon: User },
    { key: "notes" as const, label: t("tenantNotes"), icon: MessageSquare },
    { key: "documents" as const, label: t("viewDocuments"), icon: FileText },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300",
          open ? "opacity-100 backdrop-blur-sm bg-black/30" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-[520px] z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ background: "var(--card)" }}
      >
        {/* ─── Header with colored banner ─── */}
        <div className="shrink-0">
          <div className="relative h-28 bg-gradient-to-br from-[#45553A] via-[#5A6B4F] to-[#3D4A33] overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"60\" viewBox=\"0 0 60 60\"><circle cx=\"30\" cy=\"30\" r=\"1.5\" fill=\"white\" opacity=\"0.3\"/></svg>')" }}
            />
            <div className="absolute inset-0 flex items-end p-5">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold shadow-lg"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(12px)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {getInitials(tenant.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-white drop-shadow-sm truncate">{tenant.name}</h2>
                  <p className="text-sm text-white/70 mt-0.5">
                    {tenant.buildingName} &middot; {t("unit")} {tenant.unit}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors self-start">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>

          {/* Quick actions bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <StatusDotLight status={tenant.status} t={t} />
            <div className="flex-1" />
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              <Edit className="w-3.5 h-3.5" />
              {t("edit")}
            </button>
            <button onClick={onEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Mail className="w-3.5 h-3.5" />
              {t("contactTenant")}
            </button>
            <button onClick={() => setShowSendDoc(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Send className="w-3.5 h-3.5" />
              {t("sendDocument")}
            </button>
            <button onClick={onDelete}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-5 border-b" style={{ borderColor: "var(--border)" }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative",
                    activeTab === tab.key ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: "var(--primary)" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Tab content ─── */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "overview" && (
            <div className="p-5 space-y-5">
              {/* Contact */}
              <Section title={t("contactTenant")}>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard icon={Mail} label={t("email")} value={tenant.email} />
                  <InfoCard icon={Phone} label={t("phone")} value={tenant.phone} />
                </div>
              </Section>

              {/* Lease */}
              <Section title={t("leaseDetails")}>
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                  <div className="grid grid-cols-2 divide-x" style={{ "borderColor": "var(--border)" } as any}>
                    <LabelValue label={t("leaseStart")} value={tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("fr-CH") : "—"} />
                    <LabelValue label={t("leaseEnd")} value={tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString("fr-CH") : "—"} />
                  </div>
                  <div className="grid grid-cols-2 divide-x border-t" style={{ borderColor: "var(--border)" }}>
                    <LabelValue label={t("building")} value={tenant.buildingName} />
                    <LabelValue label={t("unit")} value={tenant.unit} />
                  </div>
                </div>
              </Section>

              {/* Financials */}
              <Section title={t("financials")}>
                <div className="rounded-2xl p-4 space-y-3 border" style={{ borderColor: "var(--border)" }}>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t("netRentLabel")}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(rentNet)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t("chargesLabel")}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(charges)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{t("totalMonthly")}</span>
                    <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>{formatCHF(total)}</span>
                  </div>
                </div>
              </Section>

              {/* Requests */}
              <Section title={t("recentActivity")}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl p-3 text-center border" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{openReqs.length}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("openRequests")}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center border" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{closedReqs.length}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("closedRequests")}</p>
                  </div>
                </div>
                {tenantRequests.length > 0 ? (
                  <div className="space-y-2">
                    {tenantRequests.slice(0, 4).map((req) => (
                      <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                        <div className={cn("w-2 h-2 rounded-full shrink-0",
                          req.status === "completed" ? "bg-emerald-500" : req.status === "in-progress" ? "bg-blue-500" : "bg-amber-500"
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate" style={{ color: "var(--foreground)" }}>{req.title}</p>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {new Date(req.createdAt).toLocaleDateString("fr-CH")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 rounded-xl" style={{ background: "var(--muted)", opacity: 0.5 }}>
                    <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("noActivity")}</p>
                  </div>
                )}
              </Section>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="p-5 space-y-4">
              <Section title={t("internalNotes")} subtitle={t("managementNotes")}>
                {/* Add note */}
                <div className="rounded-2xl p-4 space-y-3 border" style={{ borderColor: "var(--border)" }}>
                  <div className="flex gap-3">
                    <div className="w-28">
                      <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>{t("noteDate")}</Label>
                      <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)}
                        className="mt-1 text-sm h-9" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>{t("tenantNotes")}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                          placeholder={t("writeNote")} className="text-sm h-9"
                          style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                          onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                        />
                        <Button type="button" onClick={addNote} size="sm" className="h-9 px-3"
                          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  {ficheNotes.length === 0 ? (
                    <div className="text-center py-10 rounded-xl" style={{ background: "var(--background)" }}>
                      <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted)" }} />
                      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t("noNotesYet")}</p>
                    </div>
                  ) : (
                    ficheNotes.slice().sort((a, b) => b.date.localeCompare(a.date)).map((n) => (
                      <div key={n.id} className="rounded-xl p-4 group/note hover:shadow-sm transition-all border"
                        style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Calendar className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                              <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                                {new Date(n.date).toLocaleDateString("fr-CH")}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--foreground)" }}>
                              {n.text}
                            </p>
                          </div>
                          <button onClick={() => deleteNote(n.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover/note:opacity-100">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Section>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="p-5 space-y-4">
              <Section title={t("documents")}>
                {/* Upload */}
                <div className="rounded-2xl p-4 space-y-3 border" style={{ borderColor: "var(--border)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3 items-end">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>{t("category")}</Label>
                      <Select value={docCategory} onValueChange={(v: any) => setDocCategory(v)}>
                        <SelectTrigger className="mt-1 text-sm h-9" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>{t("file")}</Label>
                      <Input ref={fileInputRef} type="file" className="mt-1 text-sm h-9"
                        style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) { try { await uploadDoc(file); } catch { if (fileInputRef.current) fileInputRef.current.value = ""; } }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  {ficheDocs.length === 0 ? (
                    <div className="text-center py-10 rounded-xl" style={{ background: "var(--background)" }}>
                      <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted)" }} />
                      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t("noDocuments")}</p>
                    </div>
                  ) : (
                    ficheDocs.map((d) => (
                      <div key={d.id} className="rounded-xl p-4 group/doc hover:shadow-sm transition-all border flex items-center gap-3"
                        style={{ borderColor: "var(--border)" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                          <Paperclip className="w-4 h-4" style={{ color: "var(--primary)" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{d.filename}</p>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {d.category} &middot; {t("addedOn")} {new Date(d.uploadedAt).toLocaleDateString("fr-CH")}
                          </p>
                        </div>
                        <a href={d.dataUrl} download={d.filename} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Download className="w-4 h-4" style={{ color: "var(--primary)" }} />
                        </a>
                        <button onClick={() => deleteDoc(d.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover/doc:opacity-100">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* ─── Send Document Modal ─── */}
      {showSendDoc && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", padding: 16 }}
          onClick={() => setShowSendDoc(false)}
        >
          <div
            className="w-full max-w-lg relative"
            style={{
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--card)",
              padding: 28,
              boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSendDoc(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X className="w-4 h-4" />
            </button>

            <h2
              className="text-[17px] font-semibold mb-1"
              style={{ color: "var(--foreground)" }}
            >
              {t("sendDocumentTitle")}
            </h2>
            <p className="text-[13px] mb-6" style={{ color: "var(--muted-foreground)" }}>
              {t("sendDocumentSub")} <span className="font-medium" style={{ color: "var(--foreground)" }}>{tenant.name}</span>
            </p>

            <div className="space-y-5">
              {/* Document category */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {t("docType")}
                </label>
                <select
                  value={sendDocCategory}
                  onChange={(e) => setSendDocCategory(e.target.value as TenantDocument["category"])}
                  className="w-full text-[13px] outline-none"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                  }}
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* File picker */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {t("selectFile")}
                </label>
                <div
                  className="relative rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer hover:border-[var(--primary)]"
                  style={{ borderColor: "var(--border)", background: "var(--background)" }}
                  onClick={() => sendDocFileRef.current?.click()}
                >
                  <input
                    ref={sendDocFileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setSendDocFile(file);
                    }}
                  />
                  {sendDocFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Paperclip className="w-5 h-5" style={{ color: "var(--primary)" }} />
                      <div className="text-left">
                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{sendDocFile.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {(sendDocFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSendDocFile(null); if (sendDocFileRef.current) sendDocFileRef.current.value = ""; }}
                        className="ml-2 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t("clickToSelectFile")}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
                        PDF, DOCX, JPG, PNG...
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Optional message */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {t("optionalMessage")}
                </label>
                <textarea
                  value={sendDocMessage}
                  onChange={(e) => setSendDocMessage(e.target.value)}
                  placeholder={t("sendDocMessagePlaceholder")}
                  rows={3}
                  className="w-full text-[13px] outline-none resize-none"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendDocument}
                  disabled={!sendDocFile}
                  className="flex-1 flex items-center justify-center gap-2 text-[13px] font-medium transition-colors disabled:opacity-40"
                  style={{
                    padding: "10px 0",
                    borderRadius: 12,
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                  onMouseEnter={(e) => { if (sendDocFile) e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("sendToTenant")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendDoc(false)}
                  className="flex-1 flex items-center justify-center gap-2 text-[13px] font-medium transition-colors"
                  style={{
                    padding: "10px 0",
                    borderRadius: 12,
                    background: "var(--card)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ─── Small helper components ─── */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted-foreground)" }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</p>
        <p className="text-sm truncate" style={{ color: "var(--foreground)" }}>{value}</p>
      </div>
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5">
      <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{value}</p>
    </div>
  );
}

function StatusDotLight({ status, t }: { status: string; t: (k: string) => string }) {
  const cfg: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    pending: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    ended: { bg: "bg-slate-100 dark:bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
  };
  const c = cfg[status] ?? cfg.ended;
  const label = status === "active" ? t("active") : status === "pending" ? t("pending") : t("ended");
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {label}
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function TenantsView() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerTenantId, setDrawerTenantId] = useState<string | null>(null);
  const [noteDate, setNoteDate] = useState<string>(todayISO());
  const [noteText, setNoteText] = useState<string>("");
  const [docCategory, setDocCategory] = useState<TenantDocument["category"]>("Contrat de bail");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", buildingId: "", unit: "",
    rentNet: 0, charges: 0, leaseStart: "", leaseEnd: "",
    status: "active" as const,
    gender: "unspecified" as "male" | "female" | "unspecified",
  });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setTenants(getTenants() as any[]);
    setBuildings(getBuildings());
    setRequests(getMaintenanceRequests());
  };

  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const q = searchQuery.toLowerCase();
    return tenants.filter((tn: any) =>
      tn.name?.toLowerCase().includes(q) || tn.email?.toLowerCase().includes(q) ||
      tn.unit?.toLowerCase().includes(q) || tn.buildingName?.toLowerCase().includes(q)
    );
  }, [tenants, searchQuery]);

  const buildingsWithTenants = useMemo(() => {
    return buildings.map((b) => ({
      building: b,
      tenants: filteredTenants.filter((tn: any) => tn.buildingId === b.id),
    })).filter((g) => g.tenants.length > 0 || !searchQuery.trim());
  }, [buildings, filteredTenants, searchQuery]);

  const drawerTenant = useMemo(() => {
    if (!drawerTenantId) return null;
    return (tenants as any[]).find((tn) => tn.id === drawerTenantId) ?? null;
  }, [tenants, drawerTenantId]);

  const ficheNotes: TenantNote[] = useMemo(() => {
    const raw = (drawerTenant as any)?.notes ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [drawerTenant]);

  const ficheDocs: TenantDocument[] = useMemo(() => {
    const raw = (drawerTenant as any)?.documents ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [drawerTenant]);

  /* ─── Handlers ─── */

  const handleEmailTenant = (tenant: any) => {
    const subject = "Message concernant votre location";
    const body = `Bonjour ${tenant?.name ?? ""},\n\nConcernant votre appartement ${tenant?.buildingName ?? ""} - Unité ${tenant?.unit ?? ""},\n\n`;
    window.location.href = `mailto:${encodeURIComponent(tenant?.email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedBuilding = buildings.find((b) => b.id === formData.buildingId);
    if (!selectedBuilding) return;
    const payload: any = {
      ...formData, buildingName: (selectedBuilding as any).name,
      rentNet: Number(formData.rentNet) || 0, charges: Number(formData.charges) || 0,
      leaseEnd: formData.leaseEnd || "",
    };
    if (editingTenant) {
      const updated = (tenants as any).map((tn: any) => tn.id === (editingTenant as any).id ? { ...tn, ...payload } : tn);
      saveTenants(updated as any);
    } else {
      const newTenant: any = { id: Date.now().toString(), ...payload, notes: [], documents: [] };
      saveTenants([...(tenants as any), newTenant] as any);
    }
    setIsDialogOpen(false); setEditingTenant(null); resetForm(); loadData();
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", buildingId: "", unit: "", rentNet: 0, charges: 0, leaseStart: "", leaseEnd: "", status: "active", gender: "unspecified" });
  };

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant as Tenant);
    setFormData({
      name: tenant.name ?? "", email: tenant.email ?? "", phone: tenant.phone ?? "",
      buildingId: tenant.buildingId ?? "", unit: tenant.unit ?? "",
      rentNet: Number(tenant.rentNet ?? tenant.rent ?? 0) || 0,
      charges: Number(tenant.charges ?? 0) || 0,
      leaseStart: tenant.leaseStart ?? "", leaseEnd: tenant.leaseEnd ?? "",
      status: tenant.status ?? "active", gender: (tenant.gender ?? "unspecified") as any,
    });
    setIsDialogOpen(true); setDrawerTenantId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteTenant"))) {
      saveTenants((tenants as any).filter((tn: any) => tn.id !== id) as any);
      setDrawerTenantId(null); loadData();
    }
  };

  const handleDialogChange = (open: boolean) => { setIsDialogOpen(open); if (!open) { setEditingTenant(null); resetForm(); } };

  const openDrawer = (tenant: any) => {
    setDrawerTenantId(tenant.id); setNoteDate(todayISO()); setNoteText("");
    setDocCategory("Contrat de bail"); if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateTenantById = (tenantId: string, patch: Partial<any>) => {
    const updated = (tenants as any[]).map((tn) => tn.id === tenantId ? { ...tn, ...patch } : tn);
    saveTenants(updated as any); setTenants(updated as any);
  };

  const addNote = () => {
    if (!drawerTenantId || !noteText.trim()) return;
    const next: TenantNote = { id: `${Date.now()}`, date: noteDate || todayISO(), text: noteText.trim(), createdAt: new Date().toISOString() };
    const current = ((drawerTenant as any)?.notes ?? []) as TenantNote[];
    updateTenantById(drawerTenantId, { notes: [next, ...current] });
    setNoteText(""); setNoteDate(todayISO());
  };

  const deleteNote = (noteId: string) => {
    if (!drawerTenantId) return;
    const current = ((drawerTenant as any)?.notes ?? []) as TenantNote[];
    updateTenantById(drawerTenantId, { notes: current.filter((n) => n.id !== noteId) });
  };

  const uploadDoc = async (file: File) => {
    if (!drawerTenantId) return;
    const dataUrl = await fileToDataUrl(file);
    const next: TenantDocument = { id: `${Date.now()}`, category: docCategory, filename: file.name, mimeType: file.type || "application/octet-stream", uploadedAt: new Date().toISOString(), dataUrl };
    const current = ((drawerTenant as any)?.documents ?? []) as TenantDocument[];
    updateTenantById(drawerTenantId, { documents: [next, ...current] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteDoc = (docId: string) => {
    if (!drawerTenantId) return;
    const current = ((drawerTenant as any)?.documents ?? []) as TenantDocument[];
    updateTenantById(drawerTenantId, { documents: current.filter((d) => d.id !== docId) });
  };

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tn) => tn.status === "active").length;

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    return buildings.find((b) => b.id === selectedBuildingId) ?? null;
  }, [buildings, selectedBuildingId]);

  const selectedBuildingTenants = useMemo(() => {
    if (!selectedBuildingId) return [];
    return filteredTenants.filter((tn: any) => tn.buildingId === selectedBuildingId);
  }, [filteredTenants, selectedBuildingId]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ═══ PAGE HEADER ═══ */}
      <div className="sticky top-0 z-30 border-b" style={{
        background: "color-mix(in srgb, var(--background) 90%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: "var(--border)",
      }}>
        <div className="px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{t("tenantsTitle")}</h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{t("tenantsOverview")}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchTenants")}
                  className="pl-10 pr-4 py-2.5 rounded-xl text-sm w-64 transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: "var(--card)", border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    "--tw-ring-color": "color-mix(in srgb, var(--primary) 20%, transparent)",
                  } as any}
                />
              </div>

              {/* Add tenant */}
              <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl h-10 px-5 shadow-sm" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("addTenant")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <DialogHeader>
                    <DialogTitle style={{ color: "var(--foreground)" }}>{editingTenant ? t("editTenant") : t("newTenant")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <FormField label={t("fullName")} id="name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={t("email")} id="email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} required />
                      <FormField label={t("phone")} id="phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} required />
                    </div>
                    <div>
                      <Label style={{ color: "var(--foreground)" }}>{t("building")}</Label>
                      <Select value={formData.buildingId} onValueChange={(v) => setFormData({ ...formData, buildingId: v })}>
                        <SelectTrigger className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                          <SelectValue placeholder={t("selectBuilding")} />
                        </SelectTrigger>
                        <SelectContent>{buildings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={t("units")} id="unit" value={formData.unit} onChange={(v) => setFormData({ ...formData, unit: v })} required />
                      <div>
                        <Label style={{ color: "var(--foreground)" }}>{t("gender")}</Label>
                        <Select value={formData.gender} onValueChange={(v: any) => setFormData({ ...formData, gender: v })}>
                          <SelectTrigger className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t("male")}</SelectItem>
                            <SelectItem value="female">{t("female")}</SelectItem>
                            <SelectItem value="unspecified">{t("unspecified")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={t("netRent")} id="rentNet" type="number" value={String(formData.rentNet)} onChange={(v) => setFormData({ ...formData, rentNet: parseInt(v) || 0 })} required />
                      <FormField label={t("monthlyCharges")} id="charges" type="number" value={String(formData.charges)} onChange={(v) => setFormData({ ...formData, charges: parseInt(v) || 0 })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={t("leaseStartLabel")} id="leaseStart" type="date" value={formData.leaseStart} onChange={(v) => setFormData({ ...formData, leaseStart: v })} required />
                      <FormField label={t("leaseEndOptional")} id="leaseEnd" type="date" value={formData.leaseEnd} onChange={(v) => setFormData({ ...formData, leaseEnd: v })} />
                    </div>
                    <div>
                      <Label style={{ color: "var(--foreground)" }}>{t("status")}</Label>
                      <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t("active")}</SelectItem>
                          <SelectItem value="pending">{t("pending")}</SelectItem>
                          <SelectItem value="ended">{t("ended")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                        {editingTenant ? t("update") : t("create")}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} className="flex-1"
                        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                        {t("cancel")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-5 mt-4">
            <StatPill icon={Users} value={totalTenants} label={t("tenantCount")} />
            <div className="w-px h-7" style={{ background: "var(--border)" }} />
            <StatPill icon={CheckCircle2} value={activeTenants} label={t("active")} accent />
            <div className="w-px h-7" style={{ background: "var(--border)" }} />
            <StatPill icon={Building2} value={buildings.length} label={t("navBuildings")} />
          </div>
        </div>
      </div>

      {/* ═══ BUILDING SELECTION BUBBLES ═══ */}
      <div className="px-6 lg:px-8 py-8">
        {buildings.length > 0 ? (
          <>
            <p className="text-xs uppercase tracking-widest font-semibold mb-6" style={{ color: "var(--muted-foreground)" }}>
              {t("selectBuilding")}
            </p>
            <div className="flex flex-wrap gap-10 justify-start">
              {buildings.map((b, i) => {
                const image = BUILDING_IMAGES[i % BUILDING_IMAGES.length];
                const tenantCount = tenants.filter((tn: any) => tn.buildingId === b.id).length;
                const isSelected = selectedBuildingId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBuildingId(isSelected ? null : b.id)}
                    className="flex flex-col items-center gap-3 group transition-all"
                  >
                    <div
                      className="w-[130px] h-[130px] rounded-full overflow-hidden transition-all duration-200 shrink-0"
                      style={{
                        border: isSelected ? "4px solid var(--primary)" : "3px solid var(--border)",
                        boxShadow: isSelected
                          ? "0 0 0 4px color-mix(in srgb, var(--primary) 20%, transparent), 0 8px 24px rgba(0,0,0,0.12)"
                          : "0 4px 12px rgba(0,0,0,0.06)",
                        transform: isSelected ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      <img src={image} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="text-center">
                      <p
                        className="text-sm font-semibold leading-tight transition-colors"
                        style={{ color: isSelected ? "var(--primary)" : "var(--foreground)" }}
                      >
                        {b.name}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {b.units} {t("units")} &middot; {tenantCount} {t("tenantCount").toLowerCase()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ═══ SELECTED BUILDING → TENANT LIST ═══ */}
            {selectedBuilding && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBuildingId(null)}
                      className="p-2 rounded-xl transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                        {selectedBuilding.name}
                      </h2>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {selectedBuilding.address} &middot; {selectedBuildingTenants.length} {t("tenantCount").toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedBuildingTenants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {selectedBuildingTenants.map((tenant: any) => {
                      const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
                      const charges = Number(tenant.charges ?? 0) || 0;
                      const total = rentNet + charges;
                      return (
                        <button
                          key={tenant.id}
                          type="button"
                          onClick={() => openDrawer(tenant)}
                          className="text-left rounded-2xl p-5 transition-all duration-200 group/tenant"
                          style={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                              style={{
                                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                color: "var(--primary)",
                              }}
                            >
                              {getInitials(tenant.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--foreground)" }}>
                                {tenant.name}
                              </p>
                              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                                {t("unit")} {tenant.unit}
                              </p>
                            </div>
                            <StatusDotLight status={tenant.status} t={t} />
                          </div>

                          <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>
                              {t("totalMonthly")}
                            </span>
                            <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                              {formatCHF(total)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mt-3 opacity-0 group-hover/tenant:opacity-100 transition-opacity">
                            <span className="text-[10px] font-medium" style={{ color: "var(--muted-foreground)" }}>{t("viewProfile")}</span>
                            <ChevronRight className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                    <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--muted)" }} />
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{t("noTenants")}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 rounded-[28px] border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--muted)" }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>{t("noTenants")}</h3>
            <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>{t("startAddTenant")}</p>
            <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              <Plus className="w-4 h-4 mr-2" />{t("addTenant")}
            </Button>
          </div>
        )}
      </div>

      {/* ═══ DETAIL DRAWER ═══ */}
      <TenantDetailDrawer
        tenant={drawerTenant}
        open={!!drawerTenantId}
        onClose={() => setDrawerTenantId(null)}
        t={t}
        onEdit={() => drawerTenant && handleEdit(drawerTenant)}
        onDelete={() => drawerTenant && handleDelete(drawerTenant.id)}
        onEmail={() => drawerTenant && handleEmailTenant(drawerTenant)}
        ficheNotes={ficheNotes}
        ficheDocs={ficheDocs}
        noteDate={noteDate}
        setNoteDate={setNoteDate}
        noteText={noteText}
        setNoteText={setNoteText}
        addNote={addNote}
        deleteNote={deleteNote}
        docCategory={docCategory}
        setDocCategory={setDocCategory}
        fileInputRef={fileInputRef}
        uploadDoc={uploadDoc}
        deleteDoc={deleteDoc}
        requests={requests}
      />
    </div>
  );
}

/* ─── Reusable micro-components ─── */

function StatPill({ icon: Icon, value, label, accent }: { icon: any; value: number; label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: accent ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
        <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
      </div>
      <div>
        <p className="text-lg font-bold leading-none" style={{ color: "var(--foreground)" }}>{value}</p>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      </div>
    </div>
  );
}

function FormField({ label, id, type = "text", value, onChange, required }: {
  label: string; id: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id} style={{ color: "var(--foreground)" }}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="mt-2" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
    </div>
  );
}
