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
  Car,
  Warehouse,
} from "lucide-react";
// UI component imports removed — using inline-styled elements for full control
import {
  getTenants,
  saveTenants,
  getBuildings,
  getMaintenanceRequests,
  getNotifications,
  saveNotifications,
  getAccountingSettings,
  type Tenant,
  type Building,
  type MaintenanceRequest,
  type Notification,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { Bell, ArrowUpDown } from "lucide-react";
import { usePlanLimits } from "../lib/billing";
import { PlanLimitModal } from "./PlanLimitModal";

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

const BUILDING_PHOTOS = [
  "/building-1.jpg",
  "/building-2.jpg",
  "/building-3.jpg",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=700&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80",
];

/* ─── Helpers ─── */

// formatCHF removed — use formatAmount from CurrencyContext instead

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
  formattedTotal,
}: {
  tenant: any;
  onClick: () => void;
  t: (k: string) => string;
  formattedTotal: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left overflow-hidden transition-all duration-300 cursor-pointer focus:outline-none"
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.15)",
        padding: "14px 16px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.18)";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.10)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Avatar + Name + Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {getInitials(tenant.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-white text-[13px] leading-tight truncate">
            {tenant.name}
          </h4>
          <p className="text-[11px] text-white/55 mt-0.5">
            {t("unit")} {tenant.unit}
          </p>
        </div>
        <StatusDot status={tenant.status} t={t} showLabel={false} />
      </div>

      {/* Rent line */}
      <div className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
          {t("totalMonthly")}
        </span>
        <span className="text-[13px] font-bold text-white/95 tabular-nums">
          {formattedTotal}
        </span>
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
  formatAmount,
}: {
  building: Building;
  tenants: any[];
  index: number;
  onTenantClick: (tenant: any) => void;
  t: (k: string) => string;
  requests: MaintenanceRequest[];
  formatAmount: (amount: number) => string;
}) {
  const image = building.imageUrl || BUILDING_PHOTOS[index % BUILDING_PHOTOS.length];
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
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
        {/* Gradient overlays for readability */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1))" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.2), transparent)" }} />

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
              { label: t("revenue"), value: formatAmount(totalRevenue), accent: false },
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
              {tenants.map((tenant) => {
                const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
                const charges = Number(tenant.charges ?? 0) || 0;
                return (
                  <TenantBubble
                    key={tenant.id}
                    tenant={tenant}
                    onClick={() => onTenantClick(tenant)}
                    t={t}
                    formattedTotal={formatAmount(rentNet + charges)}
                  />
                );
              })}
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
   TENANT DETAIL POPUP — centered modal
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TenantDetailDrawer({
  tenant,
  open,
  onClose,
  t,
  onEdit,
  onDelete,
  onEmail,
  ficheDocs,
  requests,
  formatAmount,
  onAddNote,
  onDeleteNote,
  onUploadDoc,
  onDeleteDoc,
}: {
  tenant: any;
  open: boolean;
  onClose: () => void;
  t: (k: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onEmail: () => void;
  ficheDocs: TenantDocument[];
  requests: MaintenanceRequest[];
  formatAmount: (amount: number) => string;
  onAddNote: (note: { date: string; text: string }) => void;
  onDeleteNote: (noteId: string) => void;
  onUploadDoc: (file: File, category: TenantDocument["category"]) => void;
  onDeleteDoc: (docId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"profil" | "notes" | "demandes" | "documents">("profil");
  const [noteDate, setNoteDate] = useState(todayISO());
  const [noteText, setNoteText] = useState("");

  /* Send-document modal state */
  const [showSendDoc, setShowSendDoc] = useState(false);
  const [sendDocFile, setSendDocFile] = useState<File | null>(null);
  const [sendDocCategory, setSendDocCategory] = useState<TenantDocument["category"]>("Communication");
  const [sendDocMessage, setSendDocMessage] = useState("");
  const sendDocFileRef = useRef<HTMLInputElement | null>(null);

  /* Assigned units from building settings */
  const assignedUnits = React.useMemo(() => {
    if (!tenant?.buildingId) return [];
    const settings = getAccountingSettings(tenant.buildingId);
    const assignments = settings.unitAssignments || {};
    const types = settings.unitTypes || {};
    return Object.entries(assignments)
      .filter(([_, tenantId]) => tenantId === tenant.id)
      .map(([unitName]) => ({ name: unitName, type: types[unitName] || "appartement" }));
  }, [tenant?.buildingId, tenant?.id]);

  /* Upload doc state (Documents tab) */
  const [uploadCategory, setUploadCategory] = useState<TenantDocument["category"]>("Contrat de bail");
  const uploadFileRef = useRef<HTMLInputElement | null>(null);

  const handleSendDocument = async () => {
    if (!tenant || !sendDocFile) return;
    const dataUrl = await fileToDataUrl(sendDocFile);

    const docEntry: TenantDocument = {
      id: `${Date.now()}`,
      category: sendDocCategory,
      filename: sendDocFile.name,
      mimeType: sendDocFile.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      dataUrl,
    };
    const currentDocs = (tenant.documents ?? []) as TenantDocument[];

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

    const updatedTenants = getTenants() as any[];
    const updated = updatedTenants.map((tn: any) =>
      tn.id === tenant.id ? { ...tn, documents: [docEntry, ...currentDocs] } : tn
    );
    saveTenants(updated as any);

    setSendDocFile(null);
    setSendDocMessage("");
    setSendDocCategory("Communication");
    if (sendDocFileRef.current) sendDocFileRef.current.value = "";
    setShowSendDoc(false);
  };

  if (!tenant || !open) return null;

  const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
  const charges = Number(tenant.charges ?? 0) || 0;
  const total = rentNet + charges;
  const tenantRequests = requests.filter((r) => r.tenantId === tenant.id);
  const notes: TenantNote[] = Array.isArray(tenant.notes) ? tenant.notes : [];

  /* ─── Label style constant ─── */
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 650, textTransform: "uppercase" as const, letterSpacing: "0.04em",
    color: "var(--muted-foreground)", margin: 0,
  };

  /* ─── Tab definitions ─── */
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "profil", label: "Profil" },
    { key: "notes", label: "Notes" },
    { key: "demandes", label: "Demandes" },
    { key: "documents", label: "Documents" },
  ];

  /* ─── Status color helpers for requests ─── */
  const statusAccent = (status: string) => {
    if (status === "pending") return "#F59E0B";
    if (status === "in-progress") return "var(--primary)";
    if (status === "completed") return "#15803D";
    return "var(--border)";
  };
  const statusLabel = (status: string) => {
    if (status === "pending") return t("pending");
    if (status === "in-progress") return t("inProgress") || "En cours";
    if (status === "completed") return t("completed") || "Terminé";
    return status;
  };
  const priorityLabel = (p: string) => {
    if (p === "high" || p === "urgent") return { text: t("high") || "Haute", color: "#DC2626" };
    if (p === "medium") return { text: t("medium") || "Moyenne", color: "#F59E0B" };
    return { text: t("low") || "Basse", color: "#6b7280" };
  };

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)", padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 680, position: "relative",
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          borderRadius: 16, background: "var(--card)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "20px 24px", borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          {/* Avatar initials */}
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700,
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
            borderLeft: "3px solid var(--primary)",
            flexShrink: 0,
          }}>
            {getInitials(tenant.name)}
          </div>
          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{
                fontSize: 17, fontWeight: 650, color: "var(--foreground)",
                margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {tenant.name}
              </h2>
              <StatusDotLight status={tenant.status} t={t} />
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              {tenant.buildingName}
              {assignedUnits.length > 0
                ? ` · ${assignedUnits.map((u) => u.name).join(", ")}`
                : tenant.unit ? ` · ${t("unit")} ${tenant.unit}` : ""}
            </p>
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted-foreground)", flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* ═══ TAB BAR ═══ */}
        <div style={{
          display: "flex", gap: 6, padding: "12px 24px 0",
          borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 16px", fontSize: 12, fontWeight: 600,
                  borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer",
                  background: isActive ? "var(--primary)" : "var(--card)",
                  color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  marginBottom: -1,
                  borderBottom: isActive ? "1px solid var(--primary)" : "1px solid transparent",
                  letterSpacing: "0.02em",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ SCROLLABLE BODY ═══ */}
        <div style={{ overflowY: "auto", flex: 1, padding: 24 }}>

          {/* ──────── TAB: Profil ──────── */}
          {activeTab === "profil" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Contact info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 14,
                  borderRadius: 10, background: "var(--background)",
                }}>
                  <Mail style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={labelStyle}>{t("email")}</p>
                    <p style={{ fontSize: 13, color: "var(--foreground)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tenant.email}
                    </p>
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 14,
                  borderRadius: 10, background: "var(--background)",
                }}>
                  <Phone style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={labelStyle}>{t("phone")}</p>
                    <p style={{ fontSize: 13, color: "var(--foreground)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tenant.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assigned units */}
              {assignedUnits.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", margin: "0 0 8px" }}>
                    Locaux attribués
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {assignedUnits.map((u) => {
                      const IconUnit = u.type === "garage" ? Warehouse : u.type === "place_de_parc" ? Car : Home;
                      const typeLabel = u.type === "garage" ? "Garage" : u.type === "place_de_parc" ? "Place de parc" : u.type === "autre" ? "Autre" : "Appartement";
                      return (
                        <div key={u.name} style={{
                          display: "flex", alignItems: "center", gap: 7,
                          padding: "7px 12px", borderRadius: 8,
                          background: "rgba(69,85,58,0.06)", border: "1px solid rgba(69,85,58,0.12)",
                        }}>
                          <IconUnit style={{ width: 13, height: 13, color: "var(--primary)" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{u.name}</span>
                          <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 500 }}>({typeLabel})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lease dates & financials — 4 columns */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 10, background: "var(--background)", textAlign: "center" }}>
                  <p style={{ ...labelStyle, marginBottom: 4 }}>{t("leaseStart")}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                    {tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("fr-CH") : "—"}
                  </p>
                </div>
                <div style={{ padding: 12, borderRadius: 10, background: "var(--background)", textAlign: "center" }}>
                  <p style={{ ...labelStyle, marginBottom: 4 }}>{t("leaseEnd")}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                    {tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString("fr-CH") : "—"}
                  </p>
                </div>
                <div style={{ padding: 12, borderRadius: 10, background: "var(--background)", textAlign: "center" }}>
                  <p style={{ ...labelStyle, marginBottom: 4 }}>{t("netRentLabel")}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{formatAmount(rentNet)}</p>
                </div>
                <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--primary) 8%, transparent)", textAlign: "center" }}>
                  <p style={{ ...labelStyle, marginBottom: 4, color: "var(--primary)" }}>{t("totalMonthly")}</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "var(--primary)", margin: 0 }}>{formatAmount(total)}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
                <button
                  onClick={onEmail}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontSize: 13, fontWeight: 500, padding: "10px 0", borderRadius: 10,
                    border: "none", cursor: "pointer",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Mail style={{ width: 15, height: 15 }} />
                  {t("sendEmail")}
                </button>
                <button
                  onClick={() => { window.location.href = `tel:${tenant.phone}`; }}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontSize: 13, fontWeight: 500, padding: "10px 0", borderRadius: 10,
                    border: "none", cursor: "pointer",
                    background: "var(--background)", color: "var(--foreground)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                >
                  <Phone style={{ width: 15, height: 15 }} />
                  {t("call")}
                </button>
                <button
                  onClick={() => setShowSendDoc(true)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontSize: 13, fontWeight: 500, padding: "10px 0", borderRadius: 10,
                    border: "none", cursor: "pointer",
                    background: "var(--background)", color: "var(--foreground)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                >
                  <Send style={{ width: 15, height: 15 }} />
                  {t("sendDocument")}
                </button>
                <button
                  onClick={onEdit}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "10px 16px", borderRadius: 10,
                    border: "none", cursor: "pointer",
                    background: "var(--background)", color: "var(--foreground)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                >
                  <Edit style={{ width: 15, height: 15 }} />
                </button>
                <button
                  onClick={onDelete}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "10px 16px", borderRadius: 10,
                    border: "none", cursor: "pointer",
                    background: "transparent", color: "#DC2626",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          )}

          {/* ──────── TAB: Notes ──────── */}
          {activeTab === "notes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Add note form */}
              <div style={{
                padding: 16, borderRadius: 10, background: "var(--background)",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <p style={{ ...labelStyle, marginBottom: 2 }}>Ajouter une note</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--card)", color: "var(--foreground)", fontSize: 13,
                      outline: "none", width: 160,
                    }}
                  />
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Contenu de la note..."
                    rows={2}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--card)", color: "var(--foreground)", fontSize: 13,
                      outline: "none", resize: "none", fontFamily: "inherit",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      if (!noteText.trim()) return;
                      onAddNote({ date: noteDate || todayISO(), text: noteText.trim() });
                      setNoteText("");
                      setNoteDate(todayISO());
                    }}
                    disabled={!noteText.trim()}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      background: "var(--primary)", color: "var(--primary-foreground)",
                      opacity: noteText.trim() ? 1 : 0.4,
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>
                  Aucune note pour ce locataire.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notes.map((note) => (
                    <div key={note.id} style={{
                      padding: "12px 14px", borderRadius: 10,
                      background: "var(--background)", display: "flex", gap: 12, alignItems: "flex-start",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px", fontWeight: 500 }}>
                          {note.date ? new Date(note.date).toLocaleDateString("fr-CH") : "—"}
                        </p>
                        <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                          {note.text}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: "none",
                          background: "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#DC2626", flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────── TAB: Demandes ──────── */}
          {activeTab === "demandes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tenantRequests.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>
                  Aucune demande pour ce locataire.
                </p>
              ) : (
                tenantRequests.map((req) => {
                  const prio = priorityLabel(req.priority || "low");
                  return (
                    <div key={req.id} style={{
                      display: "flex", borderRadius: 10, background: "var(--background)",
                      overflow: "hidden",
                    }}>
                      {/* Left accent bar */}
                      <div style={{ width: 4, flexShrink: 0, background: statusAccent(req.status) }} />
                      <div style={{ flex: 1, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {req.title}
                          </p>
                          {/* Status badge */}
                          <span style={{
                            fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em",
                            padding: "3px 8px", borderRadius: 6, flexShrink: 0,
                            background: `color-mix(in srgb, ${statusAccent(req.status)} 12%, transparent)`,
                            color: statusAccent(req.status),
                          }}>
                            {statusLabel(req.status)}
                          </span>
                        </div>
                        {req.description && (
                          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 6px", lineHeight: 1.4 }}>
                            {req.description}
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            {req.date ? new Date(req.date).toLocaleDateString("fr-CH") : "—"}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: prio.color,
                          }}>
                            {prio.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ──────── TAB: Documents ──────── */}
          {activeTab === "documents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Upload area */}
              <div style={{
                padding: 16, borderRadius: 10, background: "var(--background)",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <p style={{ ...labelStyle, marginBottom: 2 }}>Ajouter un document</p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as TenantDocument["category"])}
                    style={{
                      padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--card)", color: "var(--foreground)", fontSize: 13, outline: "none",
                    }}
                  >
                    {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    ref={uploadFileRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { onUploadDoc(file, uploadCategory); if (uploadFileRef.current) uploadFileRef.current.value = ""; }
                    }}
                  />
                  <button
                    onClick={() => uploadFileRef.current?.click()}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      background: "var(--primary)", color: "var(--primary-foreground)",
                    }}
                  >
                    <Upload style={{ width: 14, height: 14 }} />
                    Choisir un fichier
                  </button>
                </div>
              </div>

              {/* Send document to tenant button */}
              <button
                onClick={() => setShowSendDoc(true)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 0", borderRadius: 10, border: "1px solid var(--border)",
                  background: "var(--card)", color: "var(--foreground)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
              >
                <Send style={{ width: 14, height: 14 }} />
                {t("sendDocument")}
              </button>

              {/* Document list */}
              {ficheDocs.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: 24 }}>
                  Aucun document.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ficheDocs.map((doc) => (
                    <div key={doc.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 10, background: "var(--background)",
                    }}>
                      <FileText style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.filename}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                          {doc.category} &middot; {new Date(doc.uploadedAt).toLocaleDateString("fr-CH")}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (doc.dataUrl) {
                            const a = document.createElement("a");
                            a.href = doc.dataUrl; a.download = doc.filename; a.click();
                          }
                        }}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: "none",
                          background: "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--primary)", flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Download style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        onClick={() => onDeleteDoc(doc.id)}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: "none",
                          background: "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#DC2626", flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Send Document Modal ═══ */}
      {showSendDoc && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.35)", padding: 16,
          }}
          onClick={() => setShowSendDoc(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 520, position: "relative",
              borderRadius: 16, background: "var(--card)", padding: 28,
              boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSendDoc(false)}
              style={{
                position: "absolute", top: 16, right: 16,
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>

            <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--foreground)", margin: "0 0 4px" }}>
              {t("sendDocumentTitle")}
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 24px" }}>
              {t("sendDocumentSub")} <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{tenant.name}</span>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}>{t("docType")}</label>
                <select value={sendDocCategory} onChange={(e) => setSendDocCategory(e.target.value as TenantDocument["category"])}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none" }}
                >
                  {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}>{t("selectFile")}</label>
                <div
                  style={{
                    borderRadius: 10, border: "2px dashed var(--border)", padding: 24,
                    textAlign: "center", cursor: "pointer", background: "var(--background)",
                  }}
                  onClick={() => sendDocFileRef.current?.click()}
                >
                  <input ref={sendDocFileRef} type="file" style={{ display: "none" }}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) setSendDocFile(file); }}
                  />
                  {sendDocFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                      <Paperclip style={{ width: 20, height: 20, color: "var(--primary)" }} />
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", margin: 0 }}>{sendDocFile.name}</p>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{(sendDocFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setSendDocFile(null); if (sendDocFileRef.current) sendDocFileRef.current.value = ""; }}
                        style={{
                          marginLeft: 8, padding: 4, borderRadius: 6, border: "none",
                          background: "transparent", cursor: "pointer", color: "#DC2626",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload style={{ width: 32, height: 32, margin: "0 auto 8px", display: "block", color: "var(--muted-foreground)" }} />
                      <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>{t("clickToSelectFile")}</p>
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "4px 0 0", opacity: 0.6 }}>PDF, DOCX, JPG, PNG...</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}>{t("optionalMessage")}</label>
                <textarea value={sendDocMessage} onChange={(e) => setSendDocMessage(e.target.value)}
                  placeholder={t("sendDocMessagePlaceholder")} rows={3}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--background)", color: "var(--foreground)", fontSize: 13,
                    outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                <button type="button" onClick={handleSendDocument} disabled={!sendDocFile}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    opacity: sendDocFile ? 1 : 0.4,
                  }}
                  onMouseEnter={(e) => { if (sendDocFile) e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = sendDocFile ? "1" : "0.4"; }}
                >
                  <Send style={{ width: 14, height: 14 }} />
                  {t("sendToTenant")}
                </button>
                <button type="button" onClick={() => setShowSendDoc(false)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "10px 0", borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--card)", color: "var(--foreground)",
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ─── Small helper components (inline styles only) ─── */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h3 style={{
          fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em",
          color: "var(--muted-foreground)", margin: 0,
        }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, marginTop: 2, color: "var(--muted-foreground)", opacity: 0.7, margin: "2px 0 0" }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 12,
      borderRadius: 10, border: "1px solid var(--border)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
      }}>
        <Icon style={{ width: 16, height: 16, color: "var(--primary)" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em",
          color: "var(--muted-foreground)", margin: 0,
        }}>{label}</p>
        <p style={{ fontSize: 13, color: "var(--foreground)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 14 }}>
      <p style={{
        fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em",
        color: "var(--muted-foreground)", margin: "0 0 4px",
      }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{value}</p>
    </div>
  );
}

function StatusDotLight({ status, t }: { status: string; t: (k: string) => string }) {
  const cfg: Record<string, { bg: string; fg: string; dot: string }> = {
    active: { bg: "rgba(34,197,94,0.08)", fg: "#16a34a", dot: "#22c55e" },
    pending: { bg: "rgba(245,158,11,0.08)", fg: "#b45309", dot: "#f59e0b" },
    ended: { bg: "rgba(107,114,128,0.08)", fg: "#6b7280", dot: "#9ca3af" },
  };
  const c = cfg[status] ?? cfg.ended;
  const label = status === "active" ? t("active") : status === "pending" ? t("pending") : t("ended");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.fg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: c.dot }} />
      {label}
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function TenantsView() {
  const { t } = useLanguage();
  const { formatAmount } = useCurrency();
  const { plan, limits, loading: planLoading } = usePlanLimits();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerTenantId, setDrawerTenantId] = useState<string | null>(null);
  const [noteDate, setNoteDate] = useState<string>(todayISO());
  const [noteText, setNoteText] = useState<string>("");
  const [docCategory, setDocCategory] = useState<TenantDocument["category"]>("Contrat de bail");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sortAlpha, setSortAlpha] = useState(false);

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

  const handleAddTenantClick = () => {
    if (!planLoading && limits.tenants !== null && tenants.length >= limits.tenants) {
      setShowLimitModal(true);
      return;
    }
    resetForm();
    setEditingTenant(null);
    setIsDialogOpen(true);
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
    const list = filteredTenants.filter((tn: any) => tn.buildingId === selectedBuildingId);
    if (sortAlpha) {
      return [...list].sort((a: any, b: any) => (a.name ?? "").localeCompare(b.name ?? "", "fr"));
    }
    return list;
  }, [filteredTenants, selectedBuildingId, sortAlpha]);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* ═══ PAGE CONTENT with left accent border ═══ */}
      <div style={{ padding: "32px 36px 48px", borderLeft: "4px solid var(--primary)" }}>

        {/* ═══ PAGE HEADER — matching BuildingsView style ═══ */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: "var(--foreground)", margin: 0 }}>
              {t("tenantsTitle")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4, margin: 0 }}>
              {t("tenantsOverview")}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--muted-foreground)" }} />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchTenants")}
                style={{
                  paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                  borderRadius: 14, fontSize: 13, width: 240,
                  background: "var(--card)", border: "1px solid var(--border)",
                  color: "var(--foreground)", outline: "none",
                }}
              />
            </div>

            {/* Add tenant */}
            <button
              type="button"
              onClick={handleAddTenantClick}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 14, border: "none",
                background: "var(--primary)", color: "var(--primary-foreground)",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              {t("addTenant")}
            </button>
          </div>
        </div>

        {/* ═══ SUMMARY STRIP — matching BuildingsView style ═══ */}
        {tenants.length > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 16, flexWrap: "wrap",
              padding: "16px 24px",
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "var(--card)",
              marginBottom: 32,
            }}
          >
            {[
              { label: t("tenantCount"), value: String(totalTenants) },
              { label: t("active"), value: String(activeTenants) },
              { label: t("navBuildings"), value: String(buildings.length) },
            ].map((m, i, arr) => (
              <React.Fragment key={m.label}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                    {m.value}
                  </p>
                  <p style={{ fontSize: 10, textTransform: "uppercase", marginTop: 2, color: "var(--muted-foreground)", letterSpacing: "0.06em", fontWeight: 500, margin: 0 }}>
                    {m.label}
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ height: 32, width: 1, background: "var(--border)" }} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ═══ BUILDING SELECTION — IMAGE OVERLAY CARDS ═══ */}
        {buildings.length > 0 ? (
          <>
            {!selectedBuilding && (
              <>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "var(--muted-foreground)", margin: 0, marginBottom: 20 }}>
                  {t("selectBuilding")}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 28 }}>
                  {buildings.map((b, i) => {
                    const photo = b.imageUrl || BUILDING_PHOTOS[i % BUILDING_PHOTOS.length];
                    const tenantCount = tenants.filter((tn: any) => tn.buildingId === b.id).length;
                    const activeCnt = tenants.filter((tn: any) => tn.buildingId === b.id && tn.status === "active").length;
                    const occPct = b.units > 0 ? Math.round((activeCnt / b.units) * 100) : 0;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBuildingId(b.id)}
                        style={{
                          position: "relative",
                          minHeight: 280,
                          borderRadius: 20,
                          overflow: "hidden",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: 0,
                          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                          transition: "transform 0.25s, box-shadow 0.25s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
                        }}
                      >
                        <img
                          src={photo}
                          alt={b.name}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                          loading="lazy"
                        />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.05))" }} />

                        {/* Building name + address */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "24px 26px" }}>
                          <h3 style={{ fontSize: 21, fontWeight: 700, color: "white", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                            {b.name}
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                            <MapPin style={{ width: 13, height: 13, color: "rgba(255,255,255,0.55)" }} />
                            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{b.address}</span>
                          </div>
                        </div>

                        {/* Metric pills */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 26px" }}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {[
                              { label: t("tenantCount"), value: String(tenantCount) },
                              { label: t("units"), value: String(b.units) },
                              { label: t("occupancyLabel"), value: `${occPct}%` },
                            ].map((m, mi) => (
                              <div key={mi} style={{
                                padding: "8px 14px",
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.12)",
                                backdropFilter: "blur(16px)",
                                WebkitBackdropFilter: "blur(16px)",
                                border: "1px solid rgba(255,255,255,0.12)",
                              }}>
                                <p style={{ fontSize: 15, fontWeight: 700, color: "white", margin: 0 }}>{m.value}</p>
                                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", fontWeight: 500, marginTop: 2, margin: 0 }}>{m.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ═══ SELECTED BUILDING → TENANT LIST ═══ */}
            {selectedBuilding && (
              <div>
                {/* Back + building header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedBuildingId(null); setSortAlpha(false); }}
                      style={{
                        width: 40, height: 40, borderRadius: 12,
                        border: "1px solid var(--border)", background: "var(--card)",
                        color: "var(--muted-foreground)", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                    >
                      <ChevronRight style={{ width: 16, height: 16, transform: "rotate(180deg)" }} />
                    </button>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                        {selectedBuilding.name}
                      </h2>
                      <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 2 }}>
                        {selectedBuilding.address} &middot; {selectedBuildingTenants.length} {t("tenantCount").toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Sort toggle */}
                  <button
                    type="button"
                    onClick={() => setSortAlpha(!sortAlpha)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 16px", borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: sortAlpha ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--card)",
                      color: sortAlpha ? "var(--primary)" : "var(--muted-foreground)",
                      cursor: "pointer", fontSize: 13, fontWeight: 500,
                      transition: "all 0.15s",
                    }}
                  >
                    <ArrowUpDown style={{ width: 14, height: 14 }} />
                    A → Z
                  </button>
                </div>

                {selectedBuildingTenants.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {selectedBuildingTenants.map((tenant: any) => {
                      const rentNet = Number(tenant.rentNet ?? tenant.rent ?? 0) || 0;
                      const charges = Number(tenant.charges ?? 0) || 0;
                      const total = rentNet + charges;
                      return (
                        <div
                          key={tenant.id}
                          className="group/tenant"
                          style={{
                            position: "relative",
                            borderRadius: 20,
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            padding: "24px 28px",
                            transition: "box-shadow 0.2s, transform 0.2s",
                            cursor: "pointer",
                          }}
                          onClick={() => openDrawer(tenant)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.07)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          {/* ── Action buttons — top right ── */}
                          <div
                            className="opacity-0 group-hover/tenant:opacity-100"
                            style={{
                              position: "absolute",
                              top: 16,
                              right: 16,
                              display: "flex",
                              gap: 4,
                              transition: "opacity 0.15s",
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleEdit(tenant); }}
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: "none", background: "transparent",
                                color: "var(--muted-foreground)", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background 0.15s, color 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--foreground)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                            >
                              <Edit style={{ width: 15, height: 15 }} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(tenant.id); }}
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: "none", background: "transparent",
                                color: "var(--muted-foreground)", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background 0.15s, color 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "#DC2626"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                            >
                              <Trash2 style={{ width: 15, height: 15 }} />
                            </button>
                          </div>

                          {/* ── Top section: Avatar + Name + Unit + Status ── */}
                          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                            <div
                              style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                                color: "var(--primary)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 15, fontWeight: 700, flexShrink: 0,
                              }}
                            >
                              {getInitials(tenant.name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <p style={{
                                  fontSize: 16, fontWeight: 700, color: "var(--foreground)",
                                  lineHeight: 1.3, margin: 0,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {tenant.name}
                                </p>
                                <StatusDotLight status={tenant.status} t={t} />
                              </div>
                              <p style={{
                                fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 2,
                              }}>
                                {t("unit")} {tenant.unit}
                              </p>
                            </div>
                          </div>

                          {/* ── Middle section: Contact info ── */}
                          <div style={{
                            display: "flex", gap: 24, marginBottom: 20,
                            paddingBottom: 20,
                            borderBottom: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Mail style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: "var(--foreground)" }}>
                                {tenant.email || "—"}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Phone style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: "var(--foreground)" }}>
                                {tenant.phone || "—"}
                              </span>
                            </div>
                          </div>

                          {/* ── Bottom section: Financials + Actions ── */}
                          <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
                            {/* Rent */}
                            <div style={{ flex: 1, minWidth: 90 }}>
                              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", margin: 0 }}>
                                {t("netRentLabel")}
                              </p>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0, marginTop: 4 }}>
                                {formatAmount(rentNet)}
                              </p>
                            </div>
                            {/* Total */}
                            <div style={{ flex: 1, minWidth: 90 }}>
                              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)", margin: 0 }}>
                                {t("totalMonthly")}
                              </p>
                              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)", margin: 0, marginTop: 4 }}>
                                {formatAmount(total)}
                              </p>
                            </div>
                            {/* Divider */}
                            <div style={{ width: 1, height: 36, background: "var(--border)", margin: "0 16px", flexShrink: 0 }} />
                            {/* ── Quick action buttons ── */}
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${tenant.phone}`; }}
                                title={t("call")}
                                style={{
                                  width: 38, height: 38, borderRadius: 10,
                                  border: "1px solid var(--border)", background: "var(--card)",
                                  color: "var(--muted-foreground)", cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                              >
                                <Phone style={{ width: 15, height: 15 }} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleEmailTenant(tenant); }}
                                title={t("sendEmail")}
                                style={{
                                  width: 38, height: 38, borderRadius: 10,
                                  border: "1px solid var(--border)", background: "var(--card)",
                                  color: "var(--muted-foreground)", cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                              >
                                <Mail style={{ width: 15, height: 15 }} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Send a portal notification to the tenant
                                  const allNotifications = getNotifications();
                                  const newNotif: Notification = {
                                    id: `notif-${Date.now()}`,
                                    title: t("portalNotification"),
                                    message: `${t("notificationSentTo")} ${tenant.name}`,
                                    date: new Date().toISOString(),
                                    read: false,
                                    buildingId: tenant.buildingId,
                                    recipientId: tenant.id,
                                  };
                                  saveNotifications([...allNotifications, newNotif]);
                                  alert(`${t("portalNotification")} → ${tenant.name}`);
                                }}
                                title={t("portalNotification")}
                                style={{
                                  width: 38, height: 38, borderRadius: 10,
                                  border: "1px solid var(--border)", background: "var(--card)",
                                  color: "var(--muted-foreground)", cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                              >
                                <Bell style={{ width: 15, height: 15 }} />
                              </button>
                            </div>
                          </div>
                        </div>
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
            <button
              type="button"
              onClick={handleAddTenantClick}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 14, border: "none",
                background: "var(--primary)", color: "var(--primary-foreground)",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              {t("addTenant")}
            </button>
          </div>
        )}
      </div>

      {/* ═══ ADD / EDIT TENANT FORM MODAL ═══ */}
      {isDialogOpen && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            padding: 24,
          }}
          onClick={() => handleDialogChange(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 640,
              maxHeight: "88vh",
              overflowY: "auto",
              borderRadius: 24,
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── Modal header with accent bar ─── */}
            <div style={{
              position: "relative",
              padding: "28px 32px 20px",
              borderBottom: "1px solid var(--border)",
            }}>
              {/* Top accent line */}
              <div style={{
                position: "absolute", top: 0, left: 32, right: 32, height: 3,
                borderRadius: "0 0 3px 3px",
                background: "var(--primary)",
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <User style={{ width: 20, height: 20, color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                    {editingTenant ? t("editTenant") : t("newTenant")}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 2 }}>
                    {editingTenant ? t("editTenantSub") : t("newTenantSub")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDialogChange(false)}
                style={{
                  position: "absolute", top: 20, right: 20,
                  width: 36, height: 36, borderRadius: 10,
                  border: "none", background: "transparent",
                  color: "var(--muted-foreground)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* ─── Form body ─── */}
            <form onSubmit={handleSubmit} style={{ padding: "24px 32px 28px", overflow: "hidden" }}>

              {/* Section: Personal Information */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <User style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("personalInfo")}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Full name */}
                  <StyledInput
                    label={t("fullName")} id="form-name" value={formData.name}
                    onChange={(v) => setFormData({ ...formData, name: v })}
                    icon={<User style={{ width: 15, height: 15, color: "var(--muted-foreground)" }} />}
                    required
                  />
                  {/* Email + Phone row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <StyledInput
                      label={t("email")} id="form-email" type="email" value={formData.email}
                      onChange={(v) => setFormData({ ...formData, email: v })}
                      icon={<Mail style={{ width: 15, height: 15, color: "var(--muted-foreground)" }} />}
                      required
                    />
                    <StyledInput
                      label={t("phone")} id="form-phone" value={formData.phone}
                      onChange={(v) => setFormData({ ...formData, phone: v })}
                      icon={<Phone style={{ width: 15, height: 15, color: "var(--muted-foreground)" }} />}
                      required
                    />
                  </div>
                  {/* Gender */}
                  <div style={{ maxWidth: "50%" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}>
                      {t("gender")}
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, fontSize: 13,
                        border: "1px solid var(--border)", background: "var(--background)",
                        color: "var(--foreground)", outline: "none",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <option value="male">{t("male")}</option>
                      <option value="female">{t("female")}</option>
                      <option value="unspecified">{t("unspecified")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--border)", marginBottom: 28 }} />

              {/* Section: Building & Unit */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Building2 style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("building")} & {t("units")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* Building select */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}>
                      {t("building")}
                    </label>
                    <select
                      value={formData.buildingId}
                      onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                      required
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, fontSize: 13,
                        border: "1px solid var(--border)", background: "var(--background)",
                        color: formData.buildingId ? "var(--foreground)" : "var(--muted-foreground)",
                        outline: "none", transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <option value="" disabled>{t("selectBuilding")}</option>
                      {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  {/* Unit */}
                  <StyledInput
                    label={t("units")} id="form-unit" value={formData.unit}
                    onChange={(v) => setFormData({ ...formData, unit: v })}
                    icon={<Home style={{ width: 15, height: 15, color: "var(--muted-foreground)" }} />}
                    required
                  />
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--border)", marginBottom: 28 }} />

              {/* Section: Financials */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <FileText style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("financials")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <StyledInput
                    label={t("netRentLabel")} id="form-rentNet" type="number"
                    value={String(formData.rentNet)}
                    onChange={(v) => setFormData({ ...formData, rentNet: parseInt(v) || 0 })}
                    required
                  />
                  <StyledInput
                    label={t("chargesLabel")} id="form-charges" type="number"
                    value={String(formData.charges)}
                    onChange={(v) => setFormData({ ...formData, charges: parseInt(v) || 0 })}
                    required
                  />
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--border)", marginBottom: 28 }} />

              {/* Section: Lease & Status */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Calendar style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("leaseDetails")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <StyledInput
                    label={t("leaseStartLabel")} id="form-leaseStart" type="date"
                    value={formData.leaseStart}
                    onChange={(v) => setFormData({ ...formData, leaseStart: v })}
                    required
                  />
                  <StyledInput
                    label={t("leaseEndOptional")} id="form-leaseEnd" type="date"
                    value={formData.leaseEnd}
                    onChange={(v) => setFormData({ ...formData, leaseEnd: v })}
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}>
                    {t("status")}
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["active", "pending", "ended"] as const).map((s) => {
                      const isActive = formData.status === s;
                      const colors: Record<string, { bg: string; border: string; text: string }> = {
                        active: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.4)", text: "#16a34a" },
                        pending: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)", text: "#d97706" },
                        ended: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.4)", text: "#64748b" },
                      };
                      const c = colors[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s })}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 500,
                            border: isActive ? `2px solid ${c.border}` : "1px solid var(--border)",
                            background: isActive ? c.bg : "var(--background)",
                            color: isActive ? c.text : "var(--muted-foreground)",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                        >
                          {t(s)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ─── Action buttons ─── */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 14, border: "none",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  {editingTenant ? t("update") : t("create")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDialogChange(false)}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 14,
                    border: "1px solid var(--border)", background: "var(--card)",
                    color: "var(--foreground)", fontSize: 14, fontWeight: 500,
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ TENANT PROFILE POPUP ═══ */}
      <TenantDetailDrawer
        tenant={drawerTenant}
        open={!!drawerTenantId}
        onClose={() => setDrawerTenantId(null)}
        t={t}
        onEdit={() => drawerTenant && handleEdit(drawerTenant)}
        onDelete={() => drawerTenant && handleDelete(drawerTenant.id)}
        onEmail={() => drawerTenant && handleEmailTenant(drawerTenant)}
        ficheDocs={ficheDocs}
        requests={requests}
        formatAmount={formatAmount}
        onAddNote={(note) => {
          if (!drawerTenantId) return;
          const next: TenantNote = { id: `${Date.now()}`, date: note.date, text: note.text, createdAt: new Date().toISOString() };
          const current = ((drawerTenant as any)?.notes ?? []) as TenantNote[];
          updateTenantById(drawerTenantId, { notes: [next, ...current] });
        }}
        onDeleteNote={(noteId) => {
          if (!drawerTenantId) return;
          const current = ((drawerTenant as any)?.notes ?? []) as TenantNote[];
          updateTenantById(drawerTenantId, { notes: current.filter((n) => n.id !== noteId) });
        }}
        onUploadDoc={async (file, category) => {
          if (!drawerTenantId) return;
          const dataUrl = await fileToDataUrl(file);
          const next: TenantDocument = { id: `${Date.now()}`, category, filename: file.name, mimeType: file.type || "application/octet-stream", uploadedAt: new Date().toISOString(), dataUrl };
          const current = ((drawerTenant as any)?.documents ?? []) as TenantDocument[];
          updateTenantById(drawerTenantId, { documents: [next, ...current] });
        }}
        onDeleteDoc={(docId) => {
          if (!drawerTenantId) return;
          const current = ((drawerTenant as any)?.documents ?? []) as TenantDocument[];
          updateTenantById(drawerTenantId, { documents: current.filter((d) => d.id !== docId) });
        }}
      />

      <PlanLimitModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        kind="tenant"
        currentPlan={plan}
        limit={limits.tenants}
      />
    </div>
  );
}

function StyledInput({
  label, id, type = "text", value, onChange, icon, required, placeholder,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; icon?: React.ReactNode;
  required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <div style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            pointerEvents: "none", display: "flex", alignItems: "center",
          }}>
            {icon}
          </div>
        )}
        <input
          id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: icon ? "11px 14px 11px 38px" : "11px 14px",
            borderRadius: 12, fontSize: 13,
            border: "1px solid var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>
    </div>
  );
}
