import React, { useMemo } from "react";
import { ArrowLeft, Building2, Users, Wrench, AlertCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  getBuildings,
  getTenants,
  getMaintenanceRequests,
  type Building,
  type Tenant,
  type MaintenanceRequest,
} from "../utils/storage";
import { useLanguage } from "../i18n/LanguageContext";

type BuildingDetailsViewProps = {
  buildingId: string;
  onBack?: () => void;
};

const formatCHF = (value: number) =>
  `CHF ${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(
    value
  )}`;

export function BuildingDetailsView({ buildingId, onBack }: BuildingDetailsViewProps) {
  const { t } = useLanguage();
  const buildings = getBuildings();
  const tenants = getTenants();
  const requests = getMaintenanceRequests();

  const building: Building | undefined = buildings.find((b) => b.id === buildingId);

  const buildingTenants: Tenant[] = useMemo(
    () => tenants.filter((tn) => tn.buildingId === buildingId),
    [tenants, buildingId]
  );

  const buildingRequests: MaintenanceRequest[] = useMemo(
    () => requests.filter((r) => r.buildingId === buildingId),
    [requests, buildingId]
  );

  const pendingRequests = buildingRequests.filter((r) => r.status === "pending").length;
  const inProgressRequests = buildingRequests.filter((r) => r.status === "in-progress").length;

  const totalUnits = building?.units ?? 0;
  const occupiedUnits = building?.occupiedUnits ?? 0;
  const occupancyRate =
    totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0";

  const latePaymentsCount = 0;
  const latePaymentsTotal = 0;

  if (!building) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" onClick={onBack} className="border-[#E8E5DB] text-[#171414]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
        <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl">
          <p className="text-lg font-medium text-[#171414]">B\u00E2timent introuvable</p>
          <p className="text-sm text-[#6B6560] mt-1">
            V\u00E9rifie l'ID ou l'\u00E9tat du storage.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" onClick={onBack} className="border-[#E8E5DB] text-[#171414]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <div>
            <h1 className="text-3xl mb-1 flex items-center gap-2 text-[#171414]">
              <Building2 className="w-7 h-7 text-[#45553A]" />
              {building.name}
            </h1>
            <p className="text-[#6B6560]">{building.address}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="border-[#E8E5DB] text-[#171414]">Exporter</Button>
          <Button className="bg-[#45553A] hover:bg-[#3a4930] text-white">
            Ajouter Une Action
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-[#6B6560] mb-1">{t("tenantsTitle")}</p>
          <p className="text-3xl text-[#171414]">{buildingTenants.length}</p>
          <p className="text-xs text-[#6B6560]">Actifs dans ce b\u00E2timent</p>
        </Card>

        <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 text-[#45553A]" />
          </div>
          <p className="text-sm text-[#6B6560] mb-1">{t("occupation")}</p>
          <p className="text-3xl text-[#171414]">{occupancyRate}%</p>
          <p className="text-xs text-[#6B6560]">
            {occupiedUnits}/{totalUnits} {t("unitsOccupiedOf")}
          </p>
        </Card>

        <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <Wrench className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-sm text-[#6B6560] mb-1">{t("maintenanceRequests")}</p>
          <p className="text-3xl text-[#171414]">{pendingRequests}</p>
          <p className="text-xs text-[#6B6560]">
            {inProgressRequests} {t("inProgress")}
          </p>
        </Card>

        <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-sm text-[#6B6560] mb-1">Retards Paiement</p>
          <p className="text-3xl text-[#171414]">{latePaymentsCount}</p>
          <p className="text-xs text-[#6B6560]">
            Total {formatCHF(latePaymentsTotal)}
          </p>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Vue D'ensemble</TabsTrigger>
          <TabsTrigger value="tenants">{t("tenantsTitle")}</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl">
              <h2 className="text-xl mb-4 text-[#171414]">Actions Prioritaires</h2>

              <div className="space-y-3">
                {pendingRequests > 0 ? (
                  <div className="rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] p-4">
                    <p className="font-medium text-[#171414]">Demandes En Attente</p>
                    <p className="text-sm text-[#6B6560] mt-1">
                      {pendingRequests} demande(s) n\u00E9cessitent une action.
                    </p>
                    <div className="mt-3">
                      <Button variant="outline" className="border-[#E8E5DB] text-[#171414]">Voir Les Demandes</Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] p-4">
                    <p className="font-medium text-[#171414]">Aucune Urgence</p>
                    <p className="text-sm text-[#6B6560] mt-1">
                      Pas d'action prioritaire d\u00E9tect\u00E9e.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] p-4">
                  <p className="font-medium text-[#171414]">Retards De Paiement</p>
                  <p className="text-sm text-[#6B6560] mt-1">
                    La partie paiements n'est pas encore connect\u00E9e (placeholder).
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl">
              <h2 className="text-xl mb-4 text-[#171414]">R\u00E9sum\u00E9 Locataires</h2>

              <div className="space-y-3">
                {buildingTenants.slice(0, 5).map((tn) => (
                  <div
                    key={tn.id}
                    className="flex items-center justify-between rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-[#171414]">{tn.name}</p>
                      <p className="text-xs text-[#6B6560]">
                        Unit\u00E9 {tn.unit} \u2022 {formatCHF(tn.rent)}
                      </p>
                    </div>
                    <Button variant="outline" className="border-[#E8E5DB] text-[#171414]">{t("open")}</Button>
                  </div>
                ))}

                {buildingTenants.length === 0 && (
                  <p className="text-sm text-[#6B6560]">
                    Aucun locataire enregistr\u00E9 pour ce b\u00E2timent.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tenants */}
        <TabsContent value="tenants">
          <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl mt-6">
            <h2 className="text-xl mb-4 text-[#171414]">{t("tenantsTitle")}</h2>

            <div className="space-y-3">
              {buildingTenants.map((tn) => (
                <div
                  key={tn.id}
                  className="flex items-center justify-between rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[#171414]">{tn.name}</p>
                    <p className="text-xs text-[#6B6560]">
                      Unit\u00E9 {tn.unit} \u2022 {tn.email} \u2022 {formatCHF(tn.rent)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-[#E8E5DB] text-[#171414]">Historique</Button>
                    <Button className="bg-[#45553A] hover:bg-[#3a4930] text-white">
                      {t("details")}
                    </Button>
                  </div>
                </div>
              ))}

              {buildingTenants.length === 0 && (
                <p className="text-sm text-[#6B6560]">
                  Aucun locataire enregistr\u00E9.
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Finance */}
        <TabsContent value="finance">
          <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl mt-6">
            <h2 className="text-xl mb-2 text-[#171414]">Finance</h2>
            <p className="text-sm text-[#6B6560]">
              Retards de paiement, encaissements, relances \u2014 a connecter quand tu ajoutes le mod\u00E8le "Paiements".
            </p>

            <div className="mt-6 rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] p-4">
              <p className="font-medium text-[#171414]">Retards De Paiement</p>
              <p className="text-sm text-[#6B6560] mt-1">
                Aucun flux paiement n'est encore stock\u00E9 (placeholder).
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance">
          <Card className="p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl mt-6">
            <h2 className="text-xl mb-4 text-[#171414]">Maintenance</h2>

            <div className="space-y-3">
              {buildingRequests.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-[#E8E5DB] bg-[#FAF5F2] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#171414]">{r.title}</p>
                      <p className="text-sm text-[#6B6560] mt-1">
                        Unit\u00E9 {r.unit} \u2022 Par {r.tenantName}
                      </p>
                    </div>
                    <span
                      className={[
                        "px-2 py-1 rounded-full text-xs",
                        r.status === "pending" ? "bg-yellow-100 text-yellow-700" : "",
                        r.status === "in-progress" ? "bg-blue-100 text-blue-700" : "",
                        r.status === "completed" ? "bg-green-100 text-green-700" : "",
                      ].join(" ")}
                    >
                      {r.status === "pending" ? t("pending") : ""}
                      {r.status === "in-progress" ? t("inProgress") : ""}
                      {r.status === "completed" ? t("completed") : ""}
                    </span>
                  </div>
                </div>
              ))}

              {buildingRequests.length === 0 && (
                <p className="text-sm text-[#6B6560]">
                  Aucune demande de maintenance pour ce b\u00E2timent.
                </p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
