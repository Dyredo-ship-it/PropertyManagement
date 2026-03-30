import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Wrench,
  FileText,
  CircleParking,
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Home,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getMaintenanceRequests,
  getTenants,
  getBuildings,
  type MaintenanceRequest,
  getTenantAbsences,
  saveTenantAbsences,
  addTenantAbsence,
  type TenantAbsence,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Status helpers ───────────────────────────────────────── */

const STATUS_COLORS: Record<string, { accent: string; bg: string; fg: string }> = {
  pending:       { accent: "#F59E0B", bg: "rgba(245,158,11,0.09)", fg: "#92400E" },
  "in-progress": { accent: "#3B82F6", bg: "rgba(59,130,246,0.09)", fg: "#1E40AF" },
  completed:     { accent: "#22C55E", bg: "rgba(34,197,94,0.09)",  fg: "#166534" },
};

const ACTION_COLORS = [
  { accent: "#F59E0B", bg: "rgba(245,158,11,0.07)" },
  { accent: "#3B82F6", bg: "rgba(59,130,246,0.07)" },
  { accent: "#22C55E", bg: "rgba(34,197,94,0.07)" },
];

/* ═══════════════════════════════════════════════════════════════
   TENANT DASHBOARD
═══════════════════════════════════════════════════════════════ */

export function TenantDashboardView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [myRequests, setMyRequests] = useState<MaintenanceRequest[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [building, setBuilding] = useState<any>(null);
  const [absences, setAbsences] = useState<TenantAbsence[]>([]);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({ startDate: "", endDate: "", comment: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const allRequests = getMaintenanceRequests();
      const allTenants = getTenants();
      const allBuildings = getBuildings();
      const allAbsences = getTenantAbsences();

      setRequests(allRequests);

      const currentTenant = allTenants.find((t) => t.email === user?.email);
      setTenant(currentTenant);

      if (currentTenant) {
        const tenantRequests = allRequests.filter(
          (r) => r.tenantId === currentTenant.id
        );
        setMyRequests(tenantRequests);

        const tenantBuilding = allBuildings.find(
          (b) => b.id === currentTenant.buildingId
        );
        setBuilding(tenantBuilding);

        const tenantAbsences = allAbsences.filter(a => a.tenantId === currentTenant.id);
        setAbsences(tenantAbsences);
      }
    } catch (error) {
      console.error("Error loading tenant data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const stats = useMemo(() => {
    const pending = myRequests.filter((r) => r.status === "pending").length;
    const inProgress = myRequests.filter((r) => r.status === "in-progress").length;
    const completed = myRequests.filter((r) => r.status === "completed").length;
    const total = myRequests.length;
    return { pending, inProgress, completed, total };
  }, [myRequests]);

  const recentRequests = useMemo(() => {
    return myRequests.slice(0, 3);
  }, [myRequests]);

  const handleSaveAbsence = () => {
    if (!absenceForm.startDate || !absenceForm.endDate || !tenant) return;
    const newAbsence = addTenantAbsence({
      tenantId: tenant.id,
      startDate: absenceForm.startDate,
      endDate: absenceForm.endDate,
      comment: absenceForm.comment,
    });
    setAbsences([...absences, newAbsence]);
    setShowAbsenceModal(false);
    setAbsenceForm({ startDate: "", endDate: "", comment: "" });
  };

  const formatCHF = (value: number) =>
    `CHF ${new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(value)}`;

  /* ─── Stat definitions ─── */
  const statCards = [
    { icon: Clock,       accent: "#F59E0B", label: t("waiting"),   value: stats.pending },
    { icon: TrendingUp,  accent: "#3B82F6", label: t("ongoing"),   value: stats.inProgress },
    { icon: CheckCircle, accent: "#22C55E", label: t("completed"), value: stats.completed },
    { icon: FileText,    accent: "var(--primary)", label: "Total", value: stats.total },
  ];

  /* ─── Quick action definitions ─── */
  const quickActions = [
    { icon: Wrench,        title: t("technicalRequest"),  description: t("technicalRequestDesc"),  color: ACTION_COLORS[0], onClick: () => {} },
    { icon: FileText,      title: t("adminRequest"),      description: t("adminRequestDesc"),      color: ACTION_COLORS[1], onClick: () => {} },
    { icon: CircleParking, title: t("additionalRental"),  description: t("additionalRentalDesc"),  color: ACTION_COLORS[2], onClick: () => {} },
  ];

  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* ── Hero header ── */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: "28px 30px",
          marginBottom: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 650,
              color: "var(--foreground)",
              borderLeft: "4px solid var(--primary)",
              paddingLeft: 14,
              margin: 0,
            }}
          >
            {t("hello")}, {user?.name}!
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, paddingLeft: 18 }}>
            {t("welcomeTenant")}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 14px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--background)",
          }}
        >
          <Home style={{ width: 15, height: 15, color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            {building?.name || "N/A"}
          </span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {statCards.map((s, i) => (
          <StatCard key={i} icon={s.icon} accent={s.accent} label={s.label} value={s.value} />
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: "22px 24px",
          marginBottom: 22,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: "0 0 16px" }}>
          {t("quickActions")}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {quickActions.map((a, i) => (
            <ActionCard key={i} {...a} />
          ))}
        </div>
      </div>

      {/* ── Recent requests + Tenant info ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
        {/* Recent requests */}
        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "22px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: 0 }}>
              {t("recentRequests")}
            </h2>
            <SmallButton label="Voir tout" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentRequests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 0" }}>
                <Wrench style={{ width: 36, height: 36, color: "var(--border)", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)" }}>
                  {t("noRequestsYet")}
                </p>
              </div>
            ) : (
              recentRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </div>
        </div>

        {/* Tenant info */}
        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "22px 24px",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: "0 0 16px" }}>
            {t("myInfo")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <InfoRow label={t("unit")} value={tenant?.unit || "N/A"} />
            <InfoRow label={t("monthlyRent")} value={tenant?.rentNet ? formatCHF(tenant.rentNet) : "N/A"} />
            <InfoRow label={t("leaseStart")} value={tenant?.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("fr-CH") : "N/A"} />
            <InfoRow label={t("leaseEnd")} value={tenant?.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString("fr-CH") : "N/A"} />
            <InfoRow label={t("address")} value={building?.address || "N/A"} />
          </div>

          <ContactButton
            label={t("contactManagement")}
            onClick={() => {
              window.location.href = `mailto:gerance@immostore.ch?subject=Contact%20depuis%20l'application`;
            }}
          />
        </div>
      </div>

      {/* ── Absences ── */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: "22px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: 0 }}>
            {t("myAbsences")}
          </h2>
          <SmallButton
            label={t("reportAbsence")}
            icon={<Plus style={{ width: 13, height: 13 }} />}
            onClick={() => setShowAbsenceModal(true)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {absences.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t("noAbsences")}</p>
            </div>
          ) : (
            absences.map((abs) => (
              <div
                key={abs.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                  Du {new Date(abs.startDate).toLocaleDateString("fr-CH")} au{" "}
                  {new Date(abs.endDate).toLocaleDateString("fr-CH")}
                </span>
                {abs.comment && (
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{abs.comment}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Absence modal ── */}
      {showAbsenceModal && <AbsenceModal
        form={absenceForm}
        setForm={setAbsenceForm}
        onSave={handleSaveAbsence}
        onClose={() => setShowAbsenceModal(false)}
      />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

/* ── Stat card ── */
function StatCard({
  icon: Icon,
  accent,
  label,
  value,
}: {
  icon: React.ComponentType<any>;
  accent: string;
  label: string;
  value: string | number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${accent}`,
        background: "var(--card)",
        padding: "18px 18px",
        borderColor: hovered ? accent : undefined,
        boxShadow: hovered ? `0 2px 12px ${accent}18` : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "rgba(69,85,58,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon style={{ width: 14, height: 14, color: accent }} />
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>{value}</div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          color: "var(--muted-foreground)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Action card ── */
function ActionCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: { accent: string; bg: string };
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left" as const,
        borderRadius: 14,
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${color.accent}`,
        background: hovered ? "var(--background)" : "var(--card)",
        padding: "18px 18px",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
        borderColor: hovered ? color.accent : undefined,
        boxShadow: hovered ? `0 2px 12px ${color.accent}18` : "none",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: color.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon style={{ width: 14, height: 14, color: color.accent }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 650, color: "var(--foreground)", marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.45 }}>{description}</div>
    </button>
  );
}

/* ── Request card ── */
function RequestCard({ request }: { request: MaintenanceRequest }) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);

  const sc = STATUS_COLORS[request.status] || { accent: "#6B7280", bg: "rgba(107,114,128,0.09)", fg: "#4B5563" };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":     return t("pending");
      case "in-progress": return t("inProgress");
      case "completed":   return t("completed");
      default:            return status;
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${sc.accent}`,
        background: "var(--card)",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        borderColor: hovered ? sc.accent : undefined,
        boxShadow: hovered ? `0 2px 10px ${sc.accent}18` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
          {request.title}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 20,
            background: sc.bg,
            color: sc.fg,
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
          }}
        >
          {getStatusLabel(request.status)}
        </span>
      </div>
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.45, margin: 0 }}>
        {request.description}
      </p>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 5, marginBottom: 0 }}>
        {t("createdOn")} {new Date(request.createdAt).toLocaleDateString("fr-CH")}
      </p>
    </div>
  );
}

/* ── Info row ── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--background)",
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          color: "var(--muted-foreground)",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{value}</div>
    </div>
  );
}

/* ── Small button (section headers) ── */
function SmallButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: "5px 12px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: hovered ? "var(--background)" : "var(--card)",
        color: "var(--foreground)",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Contact button ── */
function ContactButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        marginTop: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: hovered ? "var(--background)" : "var(--card)",
        color: "var(--foreground)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <MessageSquare style={{ width: 14, height: 14 }} />
      {label}
    </button>
  );
}

/* ── Absence modal (portal) ── */
function AbsenceModal({
  form,
  setForm,
  onSave,
  onClose,
}: {
  form: { startDate: string; endDate: string; comment: string };
  setForm: React.Dispatch<React.SetStateAction<{ startDate: string; endDate: string; comment: string }>>;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [cancelHover, setCancelHover] = useState(false);
  const [saveHover, setSaveHover] = useState(false);

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--muted-foreground)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 5,
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    borderRadius: 9,
    fontSize: 13,
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    outline: "none",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "var(--primary)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "var(--border)";
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 420,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                borderLeft: "3px solid var(--primary)",
                background: "rgba(69,85,58,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus style={{ width: 13, height: 13, color: "var(--primary)" }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)" }}>
              {t("reportAbsence")}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--muted-foreground)",
              display: "flex",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>{t("startDate")}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("endDate")}</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("commentOptional")}</label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              onFocus={handleFocus}
              onBlur={handleBlur}
              rows={3}
              placeholder="Details supplementaires..."
              style={{ ...inputStyle, resize: "none" } as React.CSSProperties}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: "flex", gap: 10, padding: "16px 20px" }}>
          <button
            onClick={onClose}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: cancelHover ? "var(--background)" : "var(--card)",
              color: "var(--foreground)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {t("cancel")}
          </button>
          <button
            onClick={onSave}
            onMouseEnter={() => setSaveHover(true)}
            onMouseLeave={() => setSaveHover(false)}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 9,
              border: "none",
              background: saveHover ? "var(--primary)" : "var(--primary)",
              color: "var(--primary-foreground)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              opacity: saveHover ? 0.88 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
