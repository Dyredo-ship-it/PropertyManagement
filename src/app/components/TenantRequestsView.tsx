import React, { useEffect, useState, useMemo } from "react";
import {
  Wrench,
  FileText,
  CircleParking,
  Plus,
  X,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MessageSquare,
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
  { id: "plumbing", label: "Plomberie (robinet, fuite, etc.)" },
  { id: "heating", label: "Chauffage" },
  { id: "hot-water", label: "Eau chaude" },
  { id: "electrical", label: "\u00C9lectricit\u00E9 / Panne \u00E9lectrique" },
  { id: "water-leak", label: "Fuite d'eau importante" },
  { id: "windows-doors", label: "Fen\u00EAtres / Portes" },
  { id: "appliances", label: "Appareils / \u00C9quipements" },
  { id: "humidity-mold", label: "Humidit\u00E9 / Moisissures" },
  { id: "common-areas", label: "Parties communes" },
  { id: "other", label: "Autre probl\u00E8me technique" },
];

const ADMINISTRATIVE_CATEGORIES = [
  { id: "rent-certificate", label: "Attestation de loyer" },
  { id: "termination", label: "Annonce de d\u00E9part / R\u00E9siliation" },
  { id: "move-in-out", label: "\u00C9tat des lieux" },
  { id: "contact-change", label: "Changement de coordonn\u00E9es" },
  { id: "occupant-change", label: "Changement d'occupant" },
  { id: "other-admin", label: "Autre demande administrative" },
];

const RENTAL_CATEGORIES = [
  { id: "garage", label: "Place de garage" },
  { id: "parking", label: "Place de parc ext\u00E9rieure" },
  { id: "storage", label: "Cave / Local de stockage" },
  { id: "other-rental", label: "Autre location" },
];

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
    };

    const updatedRequests = [...requests, newRequest];
    saveMaintenanceRequests(updatedRequests);
    setRequests(updatedRequests);
    setMyRequests([...myRequests, newRequest]);

    // Reset form
    setFormData({
      category: "",
      title: "",
      description: "",
      urgency: "medium",
      dateObserved: new Date().toISOString().split("T")[0],
    });
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

  return (
    <div className="min-h-screen bg-[#FAF5F2]">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-[#E8E5DB] p-8 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171414]">
                {t("myRequestsTitle")}
              </h1>
              <p className="mt-2 text-[#6B6560]">
                {t("manageAllRequests")}
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium transition-all hover:bg-[#3a4930] bg-[#45553A] text-white"
            >
              <Plus className="w-5 h-5" />
              {t("newRequestBtn")}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            color="text-yellow-600"
          />
          <StatCard
            label={t("inProgressRequests")}
            value={stats.inProgress}
            active={activeTab === "in-progress"}
            onClick={() => setActiveTab("in-progress")}
            color="text-blue-600"
          />
          <StatCard
            label={t("completedRequests")}
            value={stats.completed}
            active={activeTab === "completed"}
            onClick={() => setActiveTab("completed")}
            color="text-green-600"
          />
        </div>

        {/* Requests List */}
        <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-5 text-[#171414]">
            {activeTab === "all"
              ? t("allMyRequests")
              : activeTab === "pending"
              ? t("pendingRequestsLabel")
              : activeTab === "in-progress"
              ? t("inProgressRequests")
              : t("completedRequests")}
          </h2>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-16">
                <Wrench className="w-16 h-16 mx-auto mb-4 text-[#E8E5DB]" />
                <p className="text-base font-medium text-[#6B6560]">
                  {t("loading")}
                </p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16">
                <Wrench className="w-16 h-16 mx-auto mb-4 text-[#E8E5DB]" />
                <p className="text-base font-medium text-[#6B6560]">
                  {t("noRequests")}
                </p>
                <p className="text-sm mt-1 text-[#6B6560]">
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
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-[#E8E5DB] p-8 max-h-[90vh] overflow-y-auto bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#171414]">
                  {t("newRequestBtn")}
                </h2>
                <p className="text-sm mt-1 text-[#6B6560]">
                  Remplissez le formulaire ci-dessous
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl transition-colors hover:bg-[#E8E5DB]/50 text-[#6B6560]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-[#171414]">
                {t("requestType")} *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <RequestTypeButton
                  type="technical"
                  icon={Wrench}
                  label={t("technicalLabel")}
                  description={t("technicalDesc")}
                  active={requestType === "technical"}
                  onClick={() => {
                    setRequestType("technical");
                    setFormData({ ...formData, category: "" });
                  }}
                />
                <RequestTypeButton
                  type="administrative"
                  icon={FileText}
                  label={t("administrativeLabel")}
                  description={t("administrativeDesc")}
                  active={requestType === "administrative"}
                  onClick={() => {
                    setRequestType("administrative");
                    setFormData({ ...formData, category: "" });
                  }}
                />
                <RequestTypeButton
                  type="rental"
                  icon={CircleParking}
                  label={t("rentalLabel")}
                  description={t("rentalDesc")}
                  active={requestType === "rental"}
                  onClick={() => {
                    setRequestType("rental");
                    setFormData({ ...formData, category: "" });
                  }}
                />
              </div>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-[#171414]">
                {t("categoryLabel")} *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-3 rounded-2xl border text-sm bg-[#FAF5F2] border-[#E8E5DB] text-[#171414]"
              >
                <option value="">{t("selectCategory")}</option>
                {getCategoriesForType().map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-[#171414]">
                {t("titleLabel")} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t("titlePlaceholder")}
                className="w-full px-4 py-3 rounded-2xl border text-sm bg-[#FAF5F2] border-[#E8E5DB] text-[#171414]"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-[#171414]">
                {t("detailedDescription")} *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border text-sm resize-none bg-[#FAF5F2] border-[#E8E5DB] text-[#171414]"
              />
            </div>

            {/* Urgency & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-3 text-[#171414]">
                  {t("urgencyLevel")}
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      urgency: e.target.value as UrgencyLevel,
                    })
                  }
                  className="w-full px-4 py-3 rounded-2xl border text-sm bg-[#FAF5F2] border-[#E8E5DB] text-[#171414]"
                >
                  <option value="low">{t("low")}</option>
                  <option value="medium">{t("medium")}</option>
                  <option value="high">{t("high")}</option>
                  <option value="urgent">{t("urgent")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-[#171414]">
                  {t("dateObserved")}
                </label>
                <input
                  type="date"
                  value={formData.dateObserved}
                  onChange={(e) =>
                    setFormData({ ...formData, dateObserved: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl border text-sm bg-[#FAF5F2] border-[#E8E5DB] text-[#171414]"
                />
              </div>
            </div>

            {/* Photo Upload (UI only) */}
            <div className="mb-8">
              <label className="block text-sm font-semibold mb-3 text-[#171414]">
                {t("photosOptional")}
              </label>
              <div className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors hover:bg-[#FAF5F2] border-[#E8E5DB]">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-[#E8E5DB]" />
                <p className="text-sm font-medium text-[#6B6560]">
                  {t("clickToAddPhotos")}
                </p>
                <p className="text-xs mt-1 text-[#6B6560]">
                  {t("photoFormats")}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-5 py-3 rounded-2xl border font-medium transition-colors border-[#E8E5DB] bg-[#FAF5F2] text-[#171414] hover:bg-[#E8E5DB]/50"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreateRequest}
                className="flex-1 px-5 py-3 rounded-2xl font-medium transition-all hover:bg-[#3a4930] bg-[#45553A] text-white"
              >
                {t("sendRequest")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Components
function StatCard({
  label,
  value,
  active,
  onClick,
  color = "text-[#6B6560]",
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "text-left rounded-3xl border p-6 transition-all bg-white shadow-sm",
        active
          ? "border-[#45553A] bg-[#45553A]/5"
          : "border-[#E8E5DB]",
      ].join(" ")}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-[#6B6560]">
        {label}
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </button>
  );
}

function RequestTypeButton({
  type,
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "text-left rounded-2xl border p-4 transition-all",
        active
          ? "border-[#45553A] bg-[#45553A]/5"
          : "border-[#E8E5DB] bg-[#FAF5F2]",
      ].join(" ")}
    >
      <Icon className="w-6 h-6 mb-2 text-[#6B6560]" />
      <div className="font-semibold text-sm mb-1 text-[#171414]">
        {label}
      </div>
      <div className="text-xs text-[#6B6560]">
        {description}
      </div>
    </button>
  );
}

function RequestDetailCard({ request }: { request: any }) {
  const { t } = useLanguage();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          border: "border-yellow-200",
          icon: Clock,
        };
      case "in-progress":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
          icon: TrendingUp,
        };
      case "completed":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-200",
          icon: CheckCircle,
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-600",
          border: "border-gray-200",
          icon: AlertCircle,
        };
    }
  };

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

  const statusColors = getStatusColor(request.status);
  const StatusIcon = statusColors.icon;

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

  const TypeIcon = getRequestTypeIcon(request.requestType);

  return (
    <div className="rounded-2xl border border-[#E8E5DB] p-6 transition-colors hover:bg-[#FAF5F2] bg-white">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] flex items-center justify-center shrink-0">
            <TypeIcon className="w-5 h-5 text-[#6B6560]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate text-[#171414]">
              {request.title}
            </h3>
            <p className="text-sm mt-1 line-clamp-2 text-[#6B6560]">
              {request.description}
            </p>
          </div>
        </div>

        <span
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {getStatusLabel(request.status)}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#6B6560]" />
          <span className="text-xs text-[#6B6560]">
            {new Date(request.createdAt).toLocaleDateString("fr-CH")}
          </span>
        </div>

        {request.priority && (
          <div className="px-2.5 py-1 rounded-full text-xs bg-[#FAF5F2] text-[#6B6560] border border-[#E8E5DB]">
            {t("priority")}: {request.priority}
          </div>
        )}
      </div>
    </div>
  );
}
