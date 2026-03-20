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
} from "lucide-react";
import { Card } from "./ui/card";
import {
  getBuildings,
  getTenants,
  getMaintenanceRequests,
  type Building,
  type Tenant,
  type MaintenanceRequest,
} from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { BuildingsSection } from "./BuildingsSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { BuildingDetailsView } from "./BuildingDetailsView";
import { useLanguage } from "../i18n/LanguageContext";

type InfoItem = {
  Title: string;
  Description: string;
  Tag?: string;
};

const formatCHF = (value: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(
    value
  )}`;

function Bubble({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-[#E8E5DB] bg-white",
        "shadow-sm",
        "p-7",
        className,
      ].join(" ")}
    >
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-semibold text-[#171414] truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-[#6B6560] mt-1">{subtitle}</p>
            )}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}

      {children}
    </section>
  );
}

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  detail,
  rightBadge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  detail?: string;
  rightBadge?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E8E5DB] bg-white p-6 hover:bg-[#FAF5F2] transition-colors shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "w-12 h-12 rounded-2xl border border-[#E8E5DB]",
            iconBg,
            "flex items-center justify-center shrink-0",
          ].join(" ")}
        >
          <Icon className={["w-6 h-6", iconColor].join(" ")} />
        </div>

        <div className="shrink-0">{rightBadge}</div>
      </div>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#6B6560]">
          {label}
        </div>
        <div className="mt-2 text-3xl font-bold text-[#171414]">{value}</div>
        {detail ? (
          <div className="mt-2 text-sm text-[#6B6560]">{detail}</div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Simple navigation state (dashboard -> building details)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setBuildings(getBuildings());
    setTenants(getTenants());
    setRequests(getMaintenanceRequests());
  }, []);

  const infoItems: InfoItem[] = useMemo(
    () => [
      {
        Title: t("infoReferenceRate"),
        Tag: t("tagSwitzerland"),
        Description: t("infoReferenceRateDesc"),
      },
      {
        Title: t("infoCpiIndex"),
        Tag: t("tagManagement"),
        Description: t("infoCpiIndexDesc"),
      },
      {
        Title: t("infoRenewal"),
        Tag: t("tagProcess"),
        Description: t("infoRenewalDesc"),
      },
      {
        Title: t("infoMaintenance"),
        Tag: t("tagExploitation"),
        Description: t("infoMaintenanceDesc"),
      },
      {
        Title: t("infoInsurance"),
        Tag: t("tagRisk"),
        Description: t("infoInsuranceDesc"),
      },
      {
        Title: t("infoCharges"),
        Tag: t("tagFinance"),
        Description: t("infoChargesDesc"),
      },
      {
        Title: t("infoVacancy"),
        Tag: t("tagRental"),
        Description: t("infoVacancyDesc"),
      },
      {
        Title: t("infoDocumentation"),
        Tag: t("tagCompliance"),
        Description: t("infoDocumentationDesc"),
      },
    ],
    [t]
  );

  // Tenant dashboard
  if (user?.role === "tenant") {
    const myTenant = tenants.find((t) => t.email === user.email);
    const myRequests = requests.filter((r) => r.tenantId === user.id);
    const pendingCount = myRequests.filter((r) => r.status === "pending").length;
    const inProgressCount = myRequests.filter((r) => r.status === "in-progress")
      .length;

    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Hero */}
        <div className="rounded-2xl border border-[#E8E5DB] bg-white shadow-sm p-7">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171414]">
            {t("hello")}, {user.name}!
          </h1>
          <p className="text-[#6B6560] mt-2">
            {t("welcomeTenant")}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Building2}
            iconBg="bg-[#FAF5F2]"
            iconColor="text-[#45553A]"
            label={t("myBuilding")}
            value={myTenant?.buildingName || "N/A"}
          />

          <KpiCard
            icon={DollarSign}
            iconBg="bg-[#45553A]/10"
            iconColor="text-[#45553A]"
            label={t("monthlyRent")}
            value={
              (myTenant?.rent ?? null) !== null ? formatCHF(myTenant!.rent) : "N/A"
            }
            detail={t("currentAmount")}
          />

          <KpiCard
            icon={Wrench}
            iconBg="bg-[#D1D1B0]/30"
            iconColor="text-[#45553A]"
            label={t("waiting")}
            value={pendingCount}
            detail={t("requests")}
          />

          <KpiCard
            icon={AlertCircle}
            iconBg="bg-[#D1D1B0]/30"
            iconColor="text-[#45553A]"
            label={t("ongoing")}
            value={inProgressCount}
            detail={t("requests")}
          />
        </div>

        {/* Lease info */}
        <Bubble title={t("leaseInfo")} subtitle={t("leaseInfoSub")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5">
              <p className="text-xs uppercase tracking-wider text-[#6B6560] mb-2">
                {t("unit")}
              </p>
              <p className="text-lg text-[#171414]">{myTenant?.unit ?? "N/A"}</p>
            </div>

            <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5">
              <p className="text-xs uppercase tracking-wider text-[#6B6560] mb-2">
                {t("address")}
              </p>
              <p className="text-lg text-[#171414]">
                {buildings.find((b) => b.id === myTenant?.buildingId)?.address ??
                  "N/A"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5">
              <p className="text-xs uppercase tracking-wider text-[#6B6560] mb-2">
                {t("leaseStart")}
              </p>
              <p className="text-lg text-[#171414]">
                {myTenant?.leaseStart
                  ? new Date(myTenant.leaseStart).toLocaleDateString("fr-CH")
                  : "N/A"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5">
              <p className="text-xs uppercase tracking-wider text-[#6B6560] mb-2">
                {t("leaseEnd")}
              </p>
              <p className="text-lg text-[#171414]">
                {myTenant?.leaseEnd
                  ? new Date(myTenant.leaseEnd).toLocaleDateString("fr-CH")
                  : "N/A"}
              </p>
            </div>
          </div>
        </Bubble>
      </div>
    );
  }

  // If a building is selected from the dashboard cards, show details
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

  // Admin dashboard
  const totalUnits = buildings.reduce((sum, b) => sum + (b.units ?? 0), 0);
  const occupiedUnits = buildings.reduce(
    (sum, b) => sum + (b.occupiedUnits ?? 0),
    0
  );
  const totalRevenue = buildings.reduce(
    (sum, b) => sum + (b.monthlyRevenue ?? 0),
    0
  );
  const occupancyRate =
    totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0";
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  const occupancyPct = Math.max(
    0,
    Math.min(100, Number.isFinite(Number(occupancyRate)) ? Number(occupancyRate) : 0)
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl border border-[#E8E5DB] bg-white shadow-sm p-7">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#171414] tracking-tight">
              {t("dashboardTitle")}
            </h1>
            <p className="text-[#6B6560] mt-2">
              {t("dashboardSubtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="inline-flex items-center gap-2.5 h-11 px-4 rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] text-sm font-medium text-[#45553A] hover:bg-[#E8E5DB] transition-colors shrink-0"
          >
            <Info className="w-4 h-4" />
            {t("importantInfo")}
          </button>
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="bg-white border border-[#E8E5DB] max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-[#171414]">
              {t("importantInformation")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-6 max-h-[65vh] overflow-y-auto pr-2">
            {infoItems.map((item) => (
              <div
                key={item.Title}
                className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5 hover:bg-[#E8E5DB]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="font-semibold text-[#171414] text-base min-w-0 truncate">
                    {item.Title}
                  </p>
                  {item.Tag && (
                    <span className="inline-flex rounded-full bg-[#D1D1B0]/40 text-[#45553A] px-3 py-1.5 text-xs font-medium shrink-0">
                      {item.Tag}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#6B6560] leading-relaxed">
                  {item.Description}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-[#6B6560]">
            {t("infoDisclaimer")}
          </p>
        </DialogContent>
      </Dialog>

      {/* KPIs */}
      <Bubble
        title={t("kpiTitle")}
        subtitle={t("kpiSubtitle")}
        right={
          <span className="text-xs text-[#6B6560] uppercase tracking-wider">
            {t("liveData")}
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Building2}
            iconBg="bg-[#FAF5F2]"
            iconColor="text-[#45553A]"
            label={t("totalBuildings")}
            value={buildings.length}
            detail={`${totalUnits} ${t("totalUnits")}`}
            rightBadge={<TrendingUp className="w-5 h-5 text-[#45553A]" />}
          />

          <KpiCard
            icon={Users}
            iconBg="bg-[#D1D1B0]/30"
            iconColor="text-[#45553A]"
            label={t("occupancyRate")}
            value={`${occupancyRate}%`}
            detail={`${occupiedUnits} ${t("occupiedOf")} ${totalUnits}`}
            rightBadge={<TrendingUp className="w-5 h-5 text-[#45553A]" />}
          />

          <KpiCard
            icon={DollarSign}
            iconBg="bg-[#45553A]/10"
            iconColor="text-[#45553A]"
            label={t("monthlyRevenue")}
            value={formatCHF(totalRevenue)}
            detail={t("combinedTotal")}
            rightBadge={<TrendingUp className="w-5 h-5 text-[#45553A]" />}
          />

          <KpiCard
            icon={Wrench}
            iconBg="bg-[#D1D1B0]/30"
            iconColor="text-[#45553A]"
            label={t("pendingRequests")}
            value={pendingRequests}
            detail={`${requests.length} ${t("totalRequests")}`}
            rightBadge={
              pendingRequests > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#45553A]/10">
                  <AlertCircle className="w-3.5 h-3.5 text-[#45553A]" />
                  <span className="text-xs font-medium text-[#45553A]">
                    {t("actionNeeded")}
                  </span>
                </span>
              ) : null
            }
          />
        </div>
      </Bubble>

      {/* Buildings */}
      <Bubble
        title={t("buildingsPortfolio")}
        subtitle={t("buildingsPortfolioSub")}
      >
        <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-4">
          <BuildingsSection onSelectBuilding={(id) => setSelectedBuildingId(id)} />
        </div>
      </Bubble>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <Bubble
          title={t("recentRequests")}
          subtitle={t("recentRequestsSub")}
          className="h-full"
        >
          <div className="space-y-3">
            {requests.slice(0, 5).map((request) => {
              const statusLabel =
                request.status === "pending"
                  ? t("pending")
                  : request.status === "in-progress"
                  ? t("inProgress")
                  : request.status === "completed"
                  ? t("completed")
                  : request.status;

              const statusClass =
                request.status === "pending"
                  ? "bg-[#D1D1B0]/30 text-[#45553A] border-[#D1D1B0]"
                  : request.status === "in-progress"
                  ? "bg-[#45553A]/10 text-[#45553A] border-[#45553A]/20"
                  : request.status === "completed"
                  ? "bg-[#45553A]/15 text-[#45553A] border-[#45553A]/25"
                  : "bg-[#FAF5F2] text-[#6B6560] border-[#E8E5DB]";

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5 hover:bg-[#E8E5DB]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="font-semibold text-sm text-[#171414] min-w-0 truncate">
                      {request.title}
                    </p>
                    <span
                      className={[
                        "px-3 py-1.5 rounded-full text-xs font-medium border shrink-0",
                        statusClass,
                      ].join(" ")}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <p className="text-xs text-[#6B6560] mb-2 leading-relaxed">
                    {request.buildingName} · Unit {request.unit}
                  </p>
                  <p className="text-xs text-[#6B6560]">
                    {t("submittedBy")} {request.tenantName}
                  </p>
                </div>
              );
            })}

            {requests.length === 0 && (
              <div className="text-center py-14 text-[#6B6560]">
                <Wrench className="w-14 h-14 mx-auto mb-4 opacity-30" />
                <p className="text-sm font-medium text-[#171414]">
                  {t("noRequestsYet")}
                </p>
                <p className="text-xs mt-1 text-[#6B6560]">
                  {t("allRequestsHere")}
                </p>
              </div>
            )}
          </div>
        </Bubble>

        {/* Quick Stats */}
        <Bubble
          title={t("quickStats")}
          subtitle={t("quickStatsSub")}
          className="h-full"
        >
          <div className="space-y-4">
            {/* Total Properties */}
            <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-sm font-semibold text-[#171414]">
                  {t("totalProperties")}
                </p>
                <p className="text-3xl font-bold text-[#171414]">
                  {buildings.length}
                </p>
              </div>

              <div className="w-full bg-[#E8E5DB] rounded-full h-2.5 overflow-hidden">
                <div className="bg-[#45553A] h-2.5 rounded-full" style={{ width: "100%" }} />
              </div>

              <p className="text-xs text-[#6B6560] mt-3">
                {t("allOperational")}
              </p>
            </div>

            {/* Occupancy */}
            <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-sm font-semibold text-[#171414]">{t("occupancy")}</p>
                <p className="text-3xl font-bold text-[#45553A]">
                  {occupancyRate}%
                </p>
              </div>

              <div className="w-full bg-[#E8E5DB] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#45553A] h-2.5 rounded-full"
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>

              <p className="text-xs text-[#6B6560] mt-3">
                {occupiedUnits} {t("unitsOccupied")}
              </p>
            </div>

            {/* Active Tenants */}
            <div className="rounded-2xl border border-[#E8E5DB] bg-[#FAF5F2] p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <p className="text-sm font-semibold text-[#171414]">
                  {t("activeTenants")}
                </p>
                <p className="text-3xl font-bold text-[#45553A]">
                  {occupiedUnits}
                </p>
              </div>

              <div className="w-full bg-[#E8E5DB] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#D1D1B0] h-2.5 rounded-full"
                  style={{
                    width: `${
                      totalUnits > 0 ? Math.min(100, (occupiedUnits / totalUnits) * 100) : 0
                    }%`,
                  }}
                />
              </div>

              <p className="text-xs text-[#6B6560] mt-3">{t("acrossProperties")}</p>
            </div>
          </div>
        </Bubble>
      </div>
    </div>
  );
}
