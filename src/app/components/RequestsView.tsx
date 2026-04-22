import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  Banknote,
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
  Upload,
} from "lucide-react";
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
import { useNotifications } from "../context/NotificationsContext";
import { uploadMaintenancePhoto } from "../lib/mediaUpload";
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
      className="flex items-center gap-1.5 text-[12px] font-medium transition-all"
      style={{
        padding: "6px 13px",
        borderRadius: 10,
        background: active ? "var(--primary)" : "var(--card)",
        color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
        border: `1px solid ${active ? "transparent" : "var(--border)"}`,
        boxShadow: active ? "0 1px 4px rgba(69,85,58,0.18)" : "none",
        cursor: "pointer",
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
  const [docs, setDocs] = React.useState<{ name: string; type: string; data: string }[]>([]);

  React.useEffect(() => {
    if (app?.documents) setDocs(app.documents);
    else setDocs([]);
  }, [app]);

  if (!app || !open) return null;

  const actions: { key: RentalApplication["status"]; label: string; bg: string; fg: string }[] = [
    { key: "under-review", label: t("markUnderReview"), bg: "rgba(245,158,11,0.12)", fg: "#B45309" },
    { key: "accepted",     label: t("approve"),         bg: "rgba(34,197,94,0.12)",  fg: "#15803D" },
    { key: "rejected",     label: t("reject"),          bg: "rgba(239,68,68,0.10)",  fg: "#DC2626" },
  ];

  const handleUploadDoc = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 15 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const newDoc = { name: file.name, type: file.type, data: reader.result };
          setDocs((prev) => [...prev, newDoc]);
          // Persist to application
          const apps = getRentalApplications();
          const updated = apps.map((a) =>
            a.id === app.id ? { ...a, documents: [...(a.documents || []), newDoc] } : a
          );
          saveRentalApplications(updated);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteDoc = (idx: number) => {
    const updated = docs.filter((_, i) => i !== idx);
    setDocs(updated);
    const apps = getRentalApplications();
    const updatedApps = apps.map((a) =>
      a.id === app.id ? { ...a, documents: updated } : a
    );
    saveRentalApplications(updatedApps);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.35)", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 600, maxHeight: "88vh",
          borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700,
            borderLeft: "3px solid var(--primary)",
          }}>
            {getInitials(app.applicantName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 650, color: "var(--foreground)" }}>{app.applicantName}</span>
              <AppBadge status={app.status} />
            </div>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {app.occupation} · {app.employer}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Contact info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: Mail, label: t("email"), value: app.applicantEmail },
              { icon: Phone, label: t("phone"), value: app.applicantPhone },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)" }}>
                <item.icon style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", display: "block" }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{item.value}</span>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)" }}>
              <MapPin style={{ width: 13, height: 13, color: "var(--muted-foreground)", flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", display: "block" }}>{t("currentAddress")}</span>
                <span style={{ fontSize: 12, color: "var(--foreground)" }}>{app.currentAddress}</span>
              </div>
            </div>
          </div>

          {/* Application details */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", margin: "0 0 8px" }}>
              {t("applicationDetails")}
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: t("desiredMoveIn"), value: new Date(app.desiredMoveIn).toLocaleDateString("fr-CH") },
                { label: t("monthlyIncome"), value: formatCHF(app.monthlyIncome) },
                { label: t("householdSize"), value: `${app.householdSize} pers.` },
                { label: t("applicationDate"), value: new Date(app.createdAt).toLocaleDateString("fr-CH") },
              ].map((item) => (
                <div key={item.label} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--background)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", display: "block", marginBottom: 3 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          {app.message && (
            <div>
              <h4 style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", margin: "0 0 8px" }}>
                {t("applicationMessage")}
              </h4>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--background)", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                {app.message}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", margin: "0 0 8px" }}>
              Documents
            </h4>

            {/* Uploaded documents */}
            {docs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {docs.map((doc, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    background: "var(--background)", border: "1px solid var(--border)",
                  }}>
                    <FileText style={{ width: 16, height: 16, color: "var(--primary)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.name}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>
                      {doc.type.includes("pdf") ? "PDF" : doc.type.includes("image") ? "Image" : "Fichier"}
                    </span>
                    {doc.type.includes("pdf") || doc.type.includes("image") ? (
                      <a
                        href={doc.data}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={doc.name}
                        style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textDecoration: "none", flexShrink: 0 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                      >
                        Ouvrir
                      </a>
                    ) : null}
                    <button
                      onClick={() => handleDeleteDoc(idx)}
                      style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                    >
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload zone */}
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "18px 16px", borderRadius: 10,
              border: "2px dashed var(--border)", cursor: "pointer",
              textAlign: "center", transition: "border-color 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                multiple
                style={{ display: "none" }}
                onChange={(e) => { handleUploadDoc(e.target.files); e.target.value = ""; }}
              />
              <Upload style={{ width: 22, height: 22, color: "var(--border)" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)" }}>
                Carte d'identité, extrait casier judiciaire, attestation de poursuite...
              </span>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                PDF, JPG, PNG — max 15 MB
              </span>
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {actions
            .filter((a) => a.key !== app.status)
            .map((a) => (
              <button
                key={a.key}
                onClick={() => onStatusChange(app.id, a.key)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: a.bg, color: a.fg, border: "none", cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {a.label}
              </button>
            ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{ padding: "7px 18px", borderRadius: 9, fontSize: 12, fontWeight: 550, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
          >
            {t("close") || "Fermer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", margin: "0 0 8px" }}>
        {title}
      </p>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "var(--card)" }}>
        {children}
      </div>
    </div>
  );
}

function DrawerGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>;
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
    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
        <span style={{ color: "var(--muted-foreground)" }}>{icon}</span>
        <p style={{ fontSize: 10, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", margin: 0 }}>
          {label}
        </p>
      </div>
      <p className="text-[13px]" style={{ color: "var(--foreground)" }}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLED FORM HELPERS
═══════════════════════════════════════════════════════════════ */

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  fontSize: 13,
  padding: "11px 14px",
  boxSizing: "border-box",
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  outline: "none",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--foreground)",
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 36,
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */

export function RequestsView() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"maintenance" | "applications">(() => {
    try {
      const hint = sessionStorage.getItem("requests-active-tab");
      if (hint === "applications" || hint === "maintenance") {
        sessionStorage.removeItem("requests-active-tab");
        return hint;
      }
    } catch {
      /* ignore storage errors */
    }
    return "maintenance";
  });
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
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      const tenant = tenants.find((tn: any) => tn.email === user?.email);
      if (!tenant) return;
      const requestId = Date.now().toString();

      // Upload photos first so URLs are stored on the request.
      let photoUrls: string[] = [];
      if (pendingPhotos.length > 0) {
        if (!user?.organizationId) {
          setPhotoError("Organisation introuvable.");
          return;
        }
        setPhotoUploading(true);
        setPhotoError(null);
        try {
          photoUrls = await Promise.all(
            pendingPhotos.map((file) => uploadMaintenancePhoto(file, user.organizationId!, requestId)),
          );
        } catch (err) {
          setPhotoError(`Échec de l'envoi des photos: ${(err as Error).message}`);
          setPhotoUploading(false);
          return;
        }
        setPhotoUploading(false);
      }

      const req: MaintenanceRequest = {
        id: requestId,
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
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      };
      saveMaintenanceRequests([...getMaintenanceRequests(), req]);
      addNotification({
        title: `Nouvelle demande de maintenance — ${req.title}`,
        message: `${user!.name} · ${req.buildingName ?? ""} · ${req.unit ?? ""}${photoUrls.length > 0 ? ` · ${photoUrls.length} photo(s)` : ""}`,
        buildingId: req.buildingId,
        category: req.priority === "urgent" ? "urgent" : "maintenance",
      });
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", priority: "medium" });
      setPendingPhotos([]);
      setPhotoError(null);
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
    addNotification({
      title: `Nouvelle candidature — ${appFormData.applicantName}`,
      message: `${bldg.name}${appFormData.desiredUnit ? ` · ${appFormData.desiredUnit}` : ""}`,
      buildingId: appFormData.buildingId,
      category: "general",
    });
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
    <div style={{ background: "var(--background)" }}>

      {/* ── Page content with left accent border ─── */}
      <div style={{ padding: "32px 36px 48px", borderLeft: "4px solid var(--primary)" }}>

        {/* ── Page header ───────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: "var(--foreground)", margin: 0 }}>
              {isAdmin ? t("requestsHub") : t("myRequestsTitle")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4, margin: 0 }}>
              {isAdmin ? t("requestsHubSub") : t("requestsSubTenant")}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {/* Search (maintenance tab only) */}
            {activeTab === "maintenance" && (
              <div style={{ position: "relative" }}>
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--muted-foreground)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("search") + "..."}
                  style={{
                    paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                    borderRadius: 14, fontSize: 13, width: 220,
                    background: "var(--card)", border: "1px solid var(--border)",
                    color: "var(--foreground)", outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            )}

            {/* Add buttons */}
            {activeTab === "maintenance" && !isAdmin && (
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
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
                {t("newRequest")}
              </button>
            )}

            {activeTab === "applications" && isAdmin && (
              <button
                type="button"
                onClick={() => setIsAppDialogOpen(true)}
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
                {t("newRentalApplication")}
              </button>
            )}
          </div>
        </div>

        {/* Tabs (admin only) */}
        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
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
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 15px", borderRadius: 10,
                    background: isActive ? "var(--primary)" : "transparent",
                    color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    boxShadow: isActive ? "0 1px 4px rgba(69,85,58,0.18)" : "none",
                    border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--foreground)"; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; } }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  {tab.label}
                  {tab.badge > 0 && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 99,
                        fontSize: 10, fontWeight: 700,
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

        {/* ═══ MAINTENANCE TAB ═══ */}
        {activeTab === "maintenance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                      style={{
                        padding: "1px 6px", borderRadius: 99,
                        fontSize: 10, fontWeight: 700,
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
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredRequests.map((req) => {
                const sc = MAINT_STATUS[req.status] ?? MAINT_STATUS.pending;
                return (
                  <div
                    key={req.id}
                    className="group"
                    style={{
                      borderRadius: 16, overflow: "hidden",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(69,85,58,0.25)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ display: "flex" }}>
                      {/* Left accent bar */}
                      <div style={{ width: 4, flexShrink: 0, background: sc.dot }} />

                      <div style={{ flex: 1, padding: "18px 20px" }}>
                        {/* Top row: title + badges + delete */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                              <h3 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: 0, lineHeight: 1.3 }}>
                                {req.title}
                              </h3>
                            </div>
                            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {req.description}
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <PriorityBadge priority={req.priority} t={t} />
                            <MaintBadge status={req.status} t={t} />
                            <button
                              type="button"
                              onClick={() => handleDelete(req.id)}
                              className="opacity-0 group-hover:opacity-100"
                              style={{
                                width: 30, height: 30, borderRadius: 8,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "var(--muted-foreground)", border: "none",
                                background: "transparent", cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#DC2626"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: "var(--border)", marginBottom: 12 }} />

                        {/* Bottom row: meta + status actions */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                          {/* Meta info */}
                          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: 7,
                                background: "var(--background)", border: "1px solid var(--border)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Home style={{ width: 13, height: 13, color: "var(--primary)" }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>
                                {req.buildingName}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                                {t("unit")} {req.unit}
                              </span>
                            </div>

                            {isAdmin && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{
                                  width: 26, height: 26, borderRadius: 7,
                                  background: "var(--background)", border: "1px solid var(--border)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  <User style={{ width: 13, height: 13, color: "var(--muted-foreground)" }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>
                                  {req.tenantName}
                                </span>
                              </div>
                            )}

                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Calendar style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                                {formatDate(req.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Admin status actions */}
                          {isAdmin && (
                            <div style={{ display: "flex", gap: 6 }}>
                              {(["pending", "in-progress", "completed"] as const).map((s) => {
                                const sc2 = MAINT_STATUS[s];
                                const isActive = req.status === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleStatusChange(req.id, s)}
                                    disabled={isActive}
                                    style={{
                                      display: "flex", alignItems: "center", gap: 5,
                                      padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                      background: isActive ? sc2.bg : "transparent",
                                      color: isActive ? sc2.fg : "var(--muted-foreground)",
                                      border: isActive ? "1.5px solid " + sc2.dot : "1px solid var(--border)",
                                      cursor: isActive ? "default" : "pointer",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    <span style={{
                                      width: 6, height: 6, borderRadius: "50%",
                                      background: isActive ? sc2.dot : "var(--muted-foreground)",
                                    }} />
                                    {s === "pending" ? t("pending") : s === "in-progress" ? t("inProgress") : t("completed")}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredRequests.length === 0 && (
              <div
                style={{
                  borderRadius: 16, padding: "56px 20px",
                  textAlign: "center",
                  background: "var(--card)", border: "1px solid var(--border)",
                }}
              >
                <Wrench style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.2, color: "var(--muted-foreground)" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{t("noRequests")}</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                  {filter === "all" ? (isAdmin ? t("noRequestsAdmin") : t("noRequestsTenant")) : t("noRequestsFilter")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ APPLICATIONS TAB ═══ */}
        {activeTab === "applications" && isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                    <span style={{ padding: "1px 6px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: appFilter === f.key ? "rgba(255,255,255,0.22)" : "rgba(99,102,241,0.12)", color: appFilter === f.key ? "#fff" : "#4338CA" }}>
                      {(f as any).count}
                    </span>
                  )}
                </FilterPill>
              ))}
            </div>

            {/* Application cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredApplications.map((app) => {
                const sc = APP_STATUS[app.status];
                return (
                  <div
                    key={app.id}
                    className="group"
                    style={{
                      borderRadius: 16, overflow: "hidden",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onClick={() => setDrawerAppId(app.id)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(69,85,58,0.25)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ display: "flex" }}>
                      {/* Left accent bar */}
                      <div style={{ width: 4, flexShrink: 0, background: sc?.dot ?? "var(--border)" }} />

                      <div style={{ flex: 1, padding: "18px 20px" }}>
                        {/* Top row: Identity + badge + delete */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                              background: "var(--sidebar-accent)", color: "var(--primary)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14, fontWeight: 700,
                            }}>
                              {app.applicantName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: 0, lineHeight: 1.3 }}>
                                {app.applicantName}
                              </p>
                              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, marginTop: 2 }}>
                                {app.occupation}{app.employer ? ` · ${app.employer}` : ""}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <AppBadge status={app.status} />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleAppDelete(app.id); }}
                              className="opacity-0 group-hover:opacity-100"
                              style={{
                                width: 30, height: 30, borderRadius: 8,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "var(--muted-foreground)", border: "none",
                                background: "transparent", cursor: "pointer", transition: "all 0.15s",
                              }}
                              onMouseEnter={(e2) => { e2.currentTarget.style.background = "rgba(239,68,68,0.08)"; e2.currentTarget.style.color = "#DC2626"; }}
                              onMouseLeave={(e2) => { e2.currentTarget.style.background = "transparent"; e2.currentTarget.style.color = "var(--muted-foreground)"; }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: 1, background: "var(--border)", marginBottom: 14 }} />

                        {/* Bottom: metadata grid + actions */}
                        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          {/* Meta items */}
                          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: 7,
                                background: "var(--background)", border: "1px solid var(--border)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Home style={{ width: 13, height: 13, color: "var(--primary)" }} />
                              </div>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>
                                  {app.buildingName}
                                </span>
                                <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 4 }}>
                                  {t("unit")} {app.desiredUnit}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: 7,
                                background: "var(--background)", border: "1px solid var(--border)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Banknote style={{ width: 13, height: 13, color: "var(--primary)" }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                                {formatCHF(app.monthlyIncome)}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Calendar style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                                {new Date(app.desiredMoveIn).toLocaleDateString("fr-CH")}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Users style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                                {app.householdSize} {t("numberOfPersons")}
                              </span>
                            </div>
                          </div>

                          {/* Quick actions */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDrawerAppId(app.id); }}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                background: "var(--sidebar-accent)", color: "var(--primary)",
                                border: "none", cursor: "pointer", transition: "opacity 0.15s",
                              }}
                            >
                              <Eye style={{ width: 13, height: 13 }} />
                              Dossier
                            </button>
                            {app.status !== "accepted" && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAppStatusChange(app.id, "accepted"); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 5,
                                  padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                  background: "rgba(34,197,94,0.10)", color: "#15803D",
                                  border: "none", cursor: "pointer", transition: "opacity 0.15s",
                                }}
                              >
                                <CheckCheck style={{ width: 13, height: 13 }} />
                                {t("approve")}
                              </button>
                            )}
                            {app.status !== "rejected" && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAppStatusChange(app.id, "rejected"); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 5,
                                  padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                  background: "rgba(239,68,68,0.08)", color: "#DC2626",
                                  border: "none", cursor: "pointer", transition: "opacity 0.15s",
                                }}
                              >
                                <X style={{ width: 13, height: 13 }} />
                                {t("reject")}
                              </button>
                            )}
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
                style={{
                  borderRadius: 16, padding: "56px 20px",
                  textAlign: "center",
                  background: "var(--card)", border: "1px solid var(--border)",
                }}
              >
                <FileText style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.2, color: "var(--muted-foreground)" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{t("noApplications")}</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{t("noApplicationsSub")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ MAINTENANCE REQUEST FORM MODAL ═══ */}
      {isDialogOpen && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            padding: 24,
          }}
          onClick={() => setIsDialogOpen(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 580,
              maxHeight: "88vh", overflowY: "auto",
              borderRadius: 24,
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ position: "relative", padding: "28px 32px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ position: "absolute", top: 0, left: 32, right: 32, height: 3, borderRadius: "0 0 3px 3px", background: "var(--primary)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Wrench style={{ width: 20, height: 20, color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                    {t("newRequest")}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 2 }}>
                    {t("requestsSubTenant")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
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

            {/* Form body */}
            <form onSubmit={handleSubmit} style={{ padding: "24px 32px 28px" }}>
              {/* Section: Request Details */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Wrench style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("requestTitle")}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t("requestTitle")}</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>{t("requestDescription")}</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={4}
                      style={{ ...inputStyle, resize: "vertical" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>{t("priority")}</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      style={selectStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <option value="low">{t("low")}</option>
                      <option value="medium">{t("medium")}</option>
                      <option value="high">{t("high")}</option>
                    </select>
                  </div>

                  {/* Photo attachments (camera/gallery) */}
                  <div>
                    <label style={labelStyle}>Photos (optionnel)</label>
                    <div
                      style={{
                        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
                        padding: "10px 12px", border: "1px dashed var(--border)",
                        borderRadius: 10, background: "var(--background)",
                      }}
                    >
                      {pendingPhotos.map((file, idx) => {
                        const previewUrl = URL.createObjectURL(file);
                        return (
                          <div key={`${file.name}-${idx}`} style={{ position: "relative" }}>
                            <img
                              src={previewUrl}
                              alt=""
                              style={{
                                width: 64, height: 64, objectFit: "cover",
                                borderRadius: 8, border: "1px solid var(--border)",
                              }}
                              onLoad={() => URL.revokeObjectURL(previewUrl)}
                            />
                            <button
                              type="button"
                              onClick={() => setPendingPhotos((prev) => prev.filter((_, i) => i !== idx))}
                              style={{
                                position: "absolute", top: -6, right: -6, width: 20, height: 20,
                                borderRadius: "50%", border: "none",
                                background: "#DC2626", color: "white",
                                fontSize: 12, lineHeight: 1, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      <label
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                          background: "var(--card)", border: "1px solid var(--border)",
                          fontSize: 12, fontWeight: 600, color: "var(--foreground)",
                        }}
                      >
                        <Upload size={14} />
                        {pendingPhotos.length === 0 ? "Ajouter des photos" : "Ajouter"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setPendingPhotos((prev) => [...prev, ...files].slice(0, 8));
                            e.target.value = "";
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                    {photoError && (
                      <p style={{ fontSize: 11, color: "#DC2626", marginTop: 6 }}>{photoError}</p>
                    )}
                    {pendingPhotos.length > 0 && (
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
                        {pendingPhotos.length} photo(s) prête(s) — compressées à l'envoi.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                <button
                  type="submit"
                  disabled={photoUploading}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    fontSize: 13, fontWeight: 600, border: "none",
                    cursor: photoUploading ? "not-allowed" : "pointer",
                    opacity: photoUploading ? 0.7 : 1,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!photoUploading) e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { if (!photoUploading) e.currentTarget.style.opacity = "1"; }}
                >
                  {photoUploading ? "Envoi des photos…" : t("submit")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: "var(--background)", color: "var(--foreground)",
                    fontSize: 13, fontWeight: 500, border: "1px solid var(--border)", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ RENTAL APPLICATION FORM MODAL ═══ */}
      {isAppDialogOpen && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            padding: 24,
          }}
          onClick={() => setIsAppDialogOpen(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 640,
              maxHeight: "88vh", overflowY: "auto",
              borderRadius: 24,
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ position: "relative", padding: "28px 32px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ position: "absolute", top: 0, left: 32, right: 32, height: 3, borderRadius: "0 0 3px 3px", background: "var(--primary)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <FileText style={{ width: 20, height: 20, color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                    {t("newRentalApplication")}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 2 }}>
                    {t("requestsHubSub")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAppDialogOpen(false)}
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

            {/* Form body */}
            <form onSubmit={handleAppSubmit} style={{ padding: "24px 32px 28px" }}>

              {/* Section: Applicant */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <User style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("applicantInfo")}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t("applicantName")}</label>
                    <input
                      type="text"
                      value={appFormData.applicantName}
                      onChange={(e) => setAppFormData({ ...appFormData, applicantName: e.target.value })}
                      required
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("applicantEmail")}</label>
                      <input
                        type="email"
                        value={appFormData.applicantEmail}
                        onChange={(e) => setAppFormData({ ...appFormData, applicantEmail: e.target.value })}
                        required
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("applicantPhone")}</label>
                      <input
                        type="text"
                        value={appFormData.applicantPhone}
                        onChange={(e) => setAppFormData({ ...appFormData, applicantPhone: e.target.value })}
                        required
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("currentAddress")}</label>
                    <input
                      type="text"
                      value={appFormData.currentAddress}
                      onChange={(e) => setAppFormData({ ...appFormData, currentAddress: e.target.value })}
                      required
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Property */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Home style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("building")}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t("building")}</label>
                    <select
                      value={appFormData.buildingId}
                      onChange={(e) => setAppFormData({ ...appFormData, buildingId: e.target.value })}
                      required
                      style={selectStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <option value="">{t("selectBuilding")}</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("desiredUnit")}</label>
                      <input
                        type="text"
                        value={appFormData.desiredUnit}
                        onChange={(e) => setAppFormData({ ...appFormData, desiredUnit: e.target.value })}
                        required
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("desiredMoveIn")}</label>
                      <input
                        type="date"
                        value={appFormData.desiredMoveIn}
                        onChange={(e) => setAppFormData({ ...appFormData, desiredMoveIn: e.target.value })}
                        required
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Financial */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Banknote style={{ width: 14, height: 14, color: "var(--primary)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                    {t("applicationDetails")}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>{t("monthlyIncome")}</label>
                      <input
                        type="number"
                        value={appFormData.monthlyIncome}
                        onChange={(e) => setAppFormData({ ...appFormData, monthlyIncome: parseInt(e.target.value) || 0 })}
                        required
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("householdSize")}</label>
                      <input
                        type="number"
                        min={1}
                        value={appFormData.householdSize}
                        onChange={(e) => setAppFormData({ ...appFormData, householdSize: parseInt(e.target.value) || 1 })}
                        required
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("applicantOccupation")}</label>
                      <input
                        type="text"
                        value={appFormData.occupation}
                        onChange={(e) => setAppFormData({ ...appFormData, occupation: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("employer")}</label>
                    <input
                      type="text"
                      value={appFormData.employer}
                      onChange={(e) => setAppFormData({ ...appFormData, employer: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>{t("applicationMessage")}</label>
                <textarea
                  value={appFormData.message}
                  onChange={(e) => setAppFormData({ ...appFormData, message: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  {t("create")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAppDialogOpen(false)}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: "var(--background)", color: "var(--foreground)",
                    fontSize: 13, fontWeight: 500, border: "1px solid var(--border)", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
