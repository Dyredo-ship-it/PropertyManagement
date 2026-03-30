import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Wrench,
  FileText,
  CircleParking,
  Plus,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getMaintenanceRequests,
  saveMaintenanceRequests,
  getTenants,
  type MaintenanceRequest,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

type RequestType = "technical" | "administrative" | "rental";
type UrgencyLevel = "low" | "medium" | "high" | "urgent";

const TECHNICAL_CATEGORIES = [
  { id: "plumbing", key: "catPlumbing" },
  { id: "heating", key: "catHeating" },
  { id: "hot-water", key: "catHotWater" },
  { id: "electrical", key: "catElectrical" },
  { id: "water-leak", key: "catWaterLeak" },
  { id: "windows-doors", key: "catWindowsDoors" },
  { id: "appliances", key: "catAppliances" },
  { id: "humidity-mold", key: "catHumidityMold" },
  { id: "common-areas", key: "catCommonAreas" },
  { id: "other", key: "catOtherTechnical" },
];

const ADMINISTRATIVE_CATEGORIES = [
  { id: "rent-certificate", key: "catRentCertificate" },
  { id: "termination", key: "catTermination" },
  { id: "move-in-out", key: "catMoveInOut" },
  { id: "contact-change", key: "catContactChange" },
  { id: "occupant-change", key: "catOccupantChange" },
  { id: "other-admin", key: "catOtherAdmin" },
];

const RENTAL_CATEGORIES = [
  { id: "garage", key: "catGarage" },
  { id: "parking", key: "catParking" },
  { id: "storage", key: "catStorage" },
  { id: "other-rental", key: "catOtherRental" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  "in-progress": "var(--primary)",
  completed: "#15803D",
};

const STATUS_BG: Record<string, { bg: string; fg: string; dot: string }> = {
  pending:       { bg: "rgba(245,158,11,0.10)", fg: "#B45309", dot: "#F59E0B" },
  "in-progress": { bg: "rgba(69,85,58,0.10)",   fg: "var(--primary)", dot: "var(--primary)" },
  completed:     { bg: "rgba(34,197,94,0.10)",   fg: "#15803D", dot: "#22C55E" },
};

/* ================================================================
   LABEL / INPUT STYLE HELPERS
================================================================ */

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 5,
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

function useFocusBorder() {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    borderColor: focused ? "var(--primary)" : "var(--border)",
  };
}

/* ================================================================
   MAIN VIEW
================================================================ */

export function TenantRequestsView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [myRequests, setMyRequests] = useState<MaintenanceRequest[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("technical");
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
    urgency: "medium" as UrgencyLevel,
    dateObserved: new Date().toISOString().split("T")[0],
  });
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    try {
      const allRequests = getMaintenanceRequests();
      const allTenants = getTenants();
      setRequests(allRequests);
      const currentTenant = allTenants.find((t) => t.email === user?.email);
      setTenant(currentTenant);
      if (currentTenant) {
        const tenantRequests = allRequests.filter(
          (r) => r.tenantId === currentTenant.id
        );
        setMyRequests(tenantRequests);
      }
    } catch (error) {
      console.error("Error loading tenant requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const filteredRequests = useMemo(() => {
    if (activeTab === "all") return myRequests;
    return myRequests.filter((r) => r.status === activeTab);
  }, [myRequests, activeTab]);

  const stats = useMemo(() => {
    return {
      all: myRequests.length,
      pending: myRequests.filter((r) => r.status === "pending").length,
      inProgress: myRequests.filter((r) => r.status === "in-progress").length,
      completed: myRequests.filter((r) => r.status === "completed").length,
    };
  }, [myRequests]);

  const handleCreateRequest = () => {
    if (!formData.category || !formData.title || !formData.description) {
      alert(t("fillAllFields"));
      return;
    }
    if (!tenant) {
      alert("Erreur: Locataire non trouv\u00E9");
      return;
    }

    const newRequest: MaintenanceRequest = {
      id: `req-${Date.now()}`,
      buildingId: tenant.buildingId,
      buildingName: tenant.buildingName,
      unit: tenant.unit,
      tenantId: tenant.id,
      tenantName: tenant.name,
      title: formData.title,
      description: formData.description,
      priority: formData.urgency,
      status: "pending",
      createdAt: new Date().toISOString(),
      category: formData.category,
      requestType: requestType,
      dateObserved: formData.dateObserved,
      photos: photos.length > 0 ? photos : undefined,
    };

    const updatedRequests = [...requests, newRequest];
    saveMaintenanceRequests(updatedRequests);
    setRequests(updatedRequests);
    setMyRequests([...myRequests, newRequest]);

    setFormData({
      category: "",
      title: "",
      description: "",
      urgency: "medium",
      dateObserved: new Date().toISOString().split("T")[0],
    });
    setPhotos([]);
    setShowCreateModal(false);
  };

  const getCategoriesForType = () => {
    switch (requestType) {
      case "technical":
        return TECHNICAL_CATEGORIES;
      case "administrative":
        return ADMINISTRATIVE_CATEGORIES;
      case "rental":
        return RENTAL_CATEGORIES;
      default:
        return [];
    }
  };

  const sectionTitle =
    activeTab === "all"
      ? t("allMyRequests")
      : activeTab === "pending"
      ? t("pendingRequestsLabel")
      : activeTab === "in-progress"
      ? t("inProgressRequests")
      : t("completedRequests");

  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ borderLeft: "4px solid var(--primary)", paddingLeft: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 650, color: "var(--foreground)", margin: 0, lineHeight: 1.2 }}>
            {t("myRequestsTitle")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4, marginBottom: 0 }}>
            {t("manageAllRequests")}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 10,
            border: "none",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          {t("newRequestBtn")}
        </button>
      </div>

      {/* Stat filter pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard
          label={t("allMyRequests")}
          value={stats.all}
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        />
        <StatCard
          label={t("pendingRequestsLabel")}
          value={stats.pending}
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          accentColor="#F59E0B"
        />
        <StatCard
          label={t("inProgressRequests")}
          value={stats.inProgress}
          active={activeTab === "in-progress"}
          onClick={() => setActiveTab("in-progress")}
          accentColor="var(--primary)"
        />
        <StatCard
          label={t("completedRequests")}
          value={stats.completed}
          active={activeTab === "completed"}
          onClick={() => setActiveTab("completed")}
          accentColor="#15803D"
        />
      </div>

      {/* Requests list card */}
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: 0, marginBottom: 18 }}>
          {sectionTitle}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Wrench style={{ width: 40, height: 40, margin: "0 auto 12px", color: "var(--border)" }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", margin: 0 }}>
                {t("loading")}
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Wrench style={{ width: 40, height: 40, margin: "0 auto 12px", color: "var(--border)" }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--muted-foreground)", margin: 0 }}>
                {t("noRequests")}
              </p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                {t("noRequestsCreate")}
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <RequestDetailCard key={request.id} request={request} />
            ))
          )}
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateModal &&
        createPortal(
          <CreateRequestModal
            onClose={() => setShowCreateModal(false)}
            requestType={requestType}
            setRequestType={(rt: RequestType) => {
              setRequestType(rt);
              setFormData({ ...formData, category: "" });
            }}
            formData={formData}
            setFormData={setFormData}
            getCategoriesForType={getCategoriesForType}
            photos={photos}
            setPhotos={setPhotos}
            onSubmit={handleCreateRequest}
            t={t}
          />,
          document.body
        )}
    </div>
  );
}

/* ================================================================
   STAT CARD (filter pill)
================================================================ */

function StatCard({
  label,
  value,
  active,
  onClick,
  accentColor,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  accentColor?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left" as const,
        padding: "16px 18px",
        borderRadius: 14,
        border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: active ? "rgba(69,85,58,0.07)" : "var(--card)",
        cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: hovered && !active ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div style={labelStyle}>{label}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: accentColor || "var(--foreground)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </button>
  );
}

/* ================================================================
   REQUEST DETAIL CARD
================================================================ */

function RequestDetailCard({ request }: { request: any }) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);

  const statusColor = STATUS_COLORS[request.status] || "var(--border)";
  const badge = STATUS_BG[request.status] || { bg: "rgba(107,114,128,0.08)", fg: "#4B5563", dot: "#9CA3AF" };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return t("pending");
      case "in-progress":
        return t("inProgress");
      case "completed":
        return t("completed");
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return Clock;
      case "in-progress":
        return TrendingUp;
      case "completed":
        return CheckCircle;
      default:
        return AlertCircle;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case "technical":
        return Wrench;
      case "administrative":
        return FileText;
      case "rental":
        return CircleParking;
      default:
        return Wrench;
    }
  };

  const StatusIcon = getStatusIcon(request.status);
  const TypeIcon = getRequestTypeIcon(request.requestType);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        borderRadius: 14,
        border: hovered ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: "var(--card)",
        overflow: "hidden",
        transition: "all 0.15s",
        boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
      }}
    >
      {/* Left accent bar */}
      <div style={{ width: 4, flexShrink: 0, background: statusColor }} />

      <div style={{ flex: 1, padding: "16px 18px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
            {/* Type icon */}
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "rgba(69,85,58,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TypeIcon style={{ width: 14, height: 14, color: "var(--muted-foreground)" }} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--foreground)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {request.title}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  marginTop: 3,
                  marginBottom: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {request.description}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 99,
              background: badge.bg,
              color: badge.fg,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <StatusIcon style={{ width: 11, height: 11 }} />
            {getStatusLabel(request.status)}
          </span>
        </div>

        {/* Bottom meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {new Date(request.createdAt).toLocaleDateString("fr-CH")}
            </span>
          </div>

          {request.priority && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 6,
                background: "rgba(69,85,58,0.07)",
                color: "var(--muted-foreground)",
              }}
            >
              {t("priority")}: {request.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   REQUEST TYPE BUTTON (in modal)
================================================================ */

function RequestTypeButton({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  description: string;
  active: boolean;
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
        display: "flex",
        overflow: "hidden",
        borderRadius: 10,
        border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: active ? "rgba(69,85,58,0.07)" : "var(--card)",
        cursor: "pointer",
        transition: "all 0.15s",
        padding: 0,
        boxShadow: hovered && !active ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
      }}
    >
      {/* Left accent bar when active */}
      <div style={{ width: active ? 4 : 0, flexShrink: 0, background: "var(--primary)", transition: "width 0.15s" }} />

      <div style={{ padding: "12px 14px", flex: 1 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "rgba(69,85,58,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <Icon style={{ width: 14, height: 14, color: "var(--muted-foreground)" }} />
        </div>
        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--foreground)", marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.35 }}>
          {description}
        </div>
      </div>
    </button>
  );
}

/* ================================================================
   CREATE REQUEST MODAL
================================================================ */

function CreateRequestModal({
  onClose,
  requestType,
  setRequestType,
  formData,
  setFormData,
  getCategoriesForType,
  photos,
  setPhotos,
  onSubmit,
  t,
}: {
  onClose: () => void;
  requestType: RequestType;
  setRequestType: (rt: RequestType) => void;
  formData: { category: string; title: string; description: string; urgency: UrgencyLevel; dateObserved: string };
  setFormData: (fd: any) => void;
  getCategoriesForType: () => { id: string; key: string }[];
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  onSubmit: () => void;
  t: (k: string) => string;
}) {
  const categoryFocus = useFocusBorder();
  const titleFocus = useFocusBorder();
  const descFocus = useFocusBorder();
  const urgencyFocus = useFocusBorder();
  const dateFocus = useFocusBorder();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderLeft: "3px solid var(--primary)",
                paddingLeft: 10,
              }}
            >
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
                <Plus style={{ width: 14, height: 14, color: "var(--primary)" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 650, color: "var(--foreground)" }}>
                  {t("newRequestBtn")}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>
                  Remplissez le formulaire ci-dessous
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: "var(--background)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--muted-foreground)",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {/* Request Type Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t("requestType")} *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <RequestTypeButton
                icon={Wrench}
                label={t("technicalLabel")}
                description={t("technicalDesc")}
                active={requestType === "technical"}
                onClick={() => setRequestType("technical")}
              />
              <RequestTypeButton
                icon={FileText}
                label={t("administrativeLabel")}
                description={t("administrativeDesc")}
                active={requestType === "administrative"}
                onClick={() => setRequestType("administrative")}
              />
              <RequestTypeButton
                icon={CircleParking}
                label={t("rentalLabel")}
                description={t("rentalDesc")}
                active={requestType === "rental"}
                onClick={() => setRequestType("rental")}
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{t("categoryLabel")} *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              onFocus={categoryFocus.onFocus}
              onBlur={categoryFocus.onBlur}
              style={{ ...inputStyle, borderColor: categoryFocus.borderColor }}
            >
              <option value="">{t("selectCategory")}</option>
              {getCategoriesForType().map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {t(cat.key)}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{t("titleLabel")} *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t("titlePlaceholder")}
              onFocus={titleFocus.onFocus}
              onBlur={titleFocus.onBlur}
              style={{ ...inputStyle, borderColor: titleFocus.borderColor }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{t("detailedDescription")} *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t("descriptionPlaceholder")}
              rows={4}
              onFocus={descFocus.onFocus}
              onBlur={descFocus.onBlur}
              style={{ ...inputStyle, borderColor: descFocus.borderColor, resize: "none" as const }}
            />
          </div>

          {/* Urgency & Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>{t("urgencyLevel")}</label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as UrgencyLevel })}
                onFocus={urgencyFocus.onFocus}
                onBlur={urgencyFocus.onBlur}
                style={{ ...inputStyle, borderColor: urgencyFocus.borderColor }}
              >
                <option value="low">{t("low")}</option>
                <option value="medium">{t("medium")}</option>
                <option value="high">{t("high")}</option>
                <option value="urgent">{t("urgent")}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t("dateObserved")}</label>
              <input
                type="date"
                value={formData.dateObserved}
                onChange={(e) => setFormData({ ...formData, dateObserved: e.target.value })}
                onFocus={dateFocus.onFocus}
                onBlur={dateFocus.onBlur}
                style={{ ...inputStyle, borderColor: dateFocus.borderColor }}
              />
            </div>
          </div>

          {/* Photo Upload */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>{t("photosOptional")}</label>

            {/* Previews */}
            {photos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {photos.map((src, i) => (
                  <div key={i} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      style={{
                        position: "absolute", top: 3, right: 3,
                        width: 18, height: 18, borderRadius: 99,
                        background: "rgba(0,0,0,0.55)", border: "none",
                        color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone / file input */}
            <label
              style={{
                display: "block",
                border: "2px dashed var(--border)",
                borderRadius: 10,
                padding: "22px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files) return;
                  Array.from(files).forEach((file) => {
                    if (file.size > 10 * 1024 * 1024) return; // skip >10MB
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        setPhotos((prev: string[]) => [...prev, reader.result as string]);
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = ""; // reset so same file can be re-selected
                }}
              />
              <ImageIcon style={{ width: 28, height: 28, margin: "0 auto 6px", display: "block", color: "var(--border)" }} />
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", margin: 0 }}>
                {t("clickToAddPhotos")}
              </p>
              <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3, marginBottom: 0 }}>
                {t("photoFormats")}
              </p>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 22px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "9px 16px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("cancel")}
          </button>
          <button
            onClick={onSubmit}
            style={{
              flex: 1,
              padding: "9px 16px",
              borderRadius: 9,
              border: "none",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("sendRequest")}
          </button>
        </div>
      </div>
    </div>
  );
}
