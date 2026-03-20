import React, { useEffect, useState, useMemo } from "react";
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
    const inProgress = myRequests.filter((r) => r.status === "in-progress")
      .length;
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
      comment: absenceForm.comment
    });
    setAbsences([...absences, newAbsence]);
    setShowAbsenceModal(false);
    setAbsenceForm({ startDate: "", endDate: "", comment: "" });
  };

  const formatCHF = (value: number) =>
    `CHF ${new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(
      value
    )}`;

  return (
    <div className="min-h-screen bg-[#FAF5F2]">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Hero Header */}
        <div className="rounded-3xl border border-[#E8E5DB] p-8 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171414]">
                {t("hello")}, {user?.name}!
              </h1>
              <p className="mt-2 text-[#6B6560]">
                {t("welcomeTenant")}
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2]">
              <Home className="w-5 h-5 text-[#6B6560]" />
              <span className="text-sm font-medium text-[#171414]">
                {building?.name || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Clock}
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
            label={t("waiting")}
            value={stats.pending}
          />

          <StatCard
            icon={TrendingUp}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            label={t("ongoing")}
            value={stats.inProgress}
          />

          <StatCard
            icon={CheckCircle}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            label={t("completed")}
            value={stats.completed}
          />

          <StatCard
            icon={FileText}
            iconBg="bg-[#FAF5F2]"
            iconColor="text-[#6B6560]"
            label="Total"
            value={stats.total}
          />
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-5 text-[#171414]">
            {t("quickActions")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              icon={Wrench}
              title={t("technicalRequest")}
              description={t("technicalRequestDesc")}
              color="text-yellow-600"
              bgColor="bg-yellow-100"
              onClick={() => {}}
            />

            <ActionCard
              icon={FileText}
              title={t("adminRequest")}
              description={t("adminRequestDesc")}
              color="text-blue-600"
              bgColor="bg-blue-100"
              onClick={() => {}}
            />

            <ActionCard
              icon={CircleParking}
              title={t("additionalRental")}
              description={t("additionalRentalDesc")}
              color="text-green-600"
              bgColor="bg-green-100"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Recent Requests & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-[#171414]">
                {t("recentRequests")}
              </h2>
              <button className="text-sm font-medium px-3 py-1.5 rounded-xl border border-[#E8E5DB] transition-colors bg-[#FAF5F2] text-[#171414] hover:bg-[#E8E5DB]/50">
                Voir tout
              </button>
            </div>

            <div className="space-y-3">
              {recentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-[#E8E5DB]" />
                  <p className="text-sm font-medium text-[#6B6560]">
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

          {/* Tenant Info */}
          <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-5 text-[#171414]">
              {t("myInfo")}
            </h2>

            <div className="space-y-4">
              <InfoRow label={t("unit")} value={tenant?.unit || "N/A"} />
              <InfoRow
                label={t("monthlyRent")}
                value={tenant?.rentNet ? formatCHF(tenant.rentNet) : "N/A"}
              />
              <InfoRow
                label={t("leaseStart")}
                value={
                  tenant?.leaseStart
                    ? new Date(tenant.leaseStart).toLocaleDateString("fr-CH")
                    : "N/A"
                }
              />
              <InfoRow
                label={t("leaseEnd")}
                value={
                  tenant?.leaseEnd
                    ? new Date(tenant.leaseEnd).toLocaleDateString("fr-CH")
                    : "N/A"
                }
              />
              <InfoRow
                label={t("address")}
                value={building?.address || "N/A"}
              />
            </div>

            <button
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-[#E8E5DB] font-medium transition-colors hover:bg-[#E8E5DB]/50 bg-[#FAF5F2] text-[#171414]"
              onClick={() => {
                const geranceEmail = "gerance@immostore.ch";
                window.location.href = `mailto:${geranceEmail}?subject=Contact%20depuis%20l'application`;
              }}
            >
              <MessageSquare className="w-4 h-4" />
              {t("contactManagement")}
            </button>
          </div>

          {/* Absences */}
          <div className="rounded-3xl border border-[#E8E5DB] p-7 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-[#171414]">
                {t("myAbsences")}
              </h2>
              <button
                onClick={() => setShowAbsenceModal(true)}
                className="text-sm font-medium px-3 py-1.5 rounded-xl border border-[#E8E5DB] transition-colors flex items-center gap-1 bg-[#FAF5F2] text-[#171414] hover:bg-[#E8E5DB]/50"
              >
                <Plus className="w-4 h-4" />
                {t("reportAbsence")}
              </button>
            </div>

            <div className="space-y-3">
              {absences.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-[#6B6560]">
                    {t("noAbsences")}
                  </p>
                </div>
              ) : (
                absences.map((abs) => (
                  <div key={abs.id} className="p-4 rounded-xl border border-[#E8E5DB] bg-[#FAF5F2]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-[#171414]">
                        Du {new Date(abs.startDate).toLocaleDateString('fr-CH')} au {new Date(abs.endDate).toLocaleDateString('fr-CH')}
                      </span>
                    </div>
                    {abs.comment && <p className="text-xs mt-1 text-[#6B6560]">{abs.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Absence Modal */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-3xl border border-[#E8E5DB] p-6 bg-white shadow-lg">
            <h3 className="text-xl font-semibold text-[#171414] mb-4">{t("reportAbsence")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#171414] mb-2">{t("startDate")}</label>
                <input type="date" value={absenceForm.startDate} onChange={e => setAbsenceForm({...absenceForm, startDate: e.target.value})} className="w-full bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl px-4 py-2 text-[#171414]" />
              </div>
              <div>
                <label className="block text-sm text-[#171414] mb-2">{t("endDate")}</label>
                <input type="date" value={absenceForm.endDate} onChange={e => setAbsenceForm({...absenceForm, endDate: e.target.value})} className="w-full bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl px-4 py-2 text-[#171414]" />
              </div>
              <div>
                <label className="block text-sm text-[#171414] mb-2">{t("commentOptional")}</label>
                <textarea value={absenceForm.comment} onChange={e => setAbsenceForm({...absenceForm, comment: e.target.value})} className="w-full bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl px-4 py-2 text-[#171414] resize-none" rows={3} placeholder="D\u00E9tails suppl\u00E9mentaires..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAbsenceModal(false)} className="flex-1 py-2 rounded-xl border border-[#E8E5DB] text-[#171414] hover:bg-[#E8E5DB]/50 transition-colors">{t("cancel")}</button>
              <button onClick={handleSaveAbsence} className="flex-1 py-2 rounded-xl bg-[#45553A] text-white font-medium hover:bg-[#3a4930] transition-colors">{t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#E8E5DB] p-6 transition-colors bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div
          className={`w-12 h-12 rounded-2xl border border-[#E8E5DB] flex items-center justify-center ${iconBg}`}
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-[#6B6560]">
          {label}
        </div>
        <div className="text-3xl font-bold mb-2 text-[#171414]">
          {value}
        </div>
        {detail && (
          <div className="text-sm text-[#6B6560]">
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}

// Action Card Component
function ActionCard({
  icon: Icon,
  title,
  description,
  color,
  bgColor,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-[#E8E5DB] p-5 transition-all hover:bg-[#FAF5F2] bg-white"
    >
      <div
        className={`w-12 h-12 rounded-2xl border border-[#E8E5DB] flex items-center justify-center mb-4 ${bgColor}`}
      >
        <Icon className={`w-6 h-6 ${color}`} />
      </div>

      <h3 className="text-base font-semibold mb-1 text-[#171414]">
        {title}
      </h3>
      <p className="text-sm text-[#6B6560]">
        {description}
      </p>
    </button>
  );
}

// Request Card Component
function RequestCard({ request }: { request: MaintenanceRequest }) {
  const { t } = useLanguage();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          border: "border-yellow-200",
        };
      case "in-progress":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
        };
      case "completed":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-200",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-600",
          border: "border-gray-200",
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

  return (
    <div className="rounded-2xl border border-[#E8E5DB] p-5 transition-colors cursor-pointer hover:bg-[#FAF5F2] bg-white">
      <div className="flex items-start justify-between gap-4 mb-2">
        <p className="font-semibold text-sm truncate text-[#171414]">
          {request.title}
        </p>
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
        >
          {getStatusLabel(request.status)}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[#6B6560]">
        {request.description}
      </p>

      <p className="text-xs mt-2 text-[#6B6560]">
        {t("createdOn")} {new Date(request.createdAt).toLocaleDateString("fr-CH")}
      </p>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E8E5DB] p-4 bg-[#FAF5F2]">
      <p className="text-xs uppercase tracking-wider mb-2 text-[#6B6560]">
        {label}
      </p>
      <p className="text-base text-[#171414]">
        {value}
      </p>
    </div>
  );
}
