import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import { LoginPage } from "./components/LoginPage";
import { ModernSidebar } from "./components/ModernSidebar";
import { TopHeader } from "./components/TopHeader";
import { DashboardView } from "./components/DashboardView";
import { TenantDashboardView } from "./components/TenantDashboardView";
import { TenantRequestsView } from "./components/TenantRequestsView";
import { BuildingsView } from "./components/BuildingsView";
import { TenantsView } from "./components/TenantsView";
import { RequestsView } from "./components/RequestsView";
import { ServicesView } from "./components/ServicesView";
import { NotificationsView } from "./components/NotificationsView";
import { InformationsView } from "./components/InformationsView";
import { BuildingDetailsView } from "./components/BuildingDetailsView";
import { InterventionsView } from "./components/InterventionsView";

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSelectBuilding = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setActiveView("building-details");
  };

  const handleBackFromBuilding = () => {
    setSelectedBuildingId(null);
    setActiveView("buildings");
  };

  return (
    <div className="flex h-screen bg-background">
      <ModernSidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />

        <div className="flex-1 overflow-auto bg-background">
          {activeView === "dashboard" && user?.role === "admin" && <DashboardView />}
          {activeView === "dashboard" && user?.role === "tenant" && <TenantDashboardView />}
          {activeView === "buildings" && user?.role === "admin" && (
            <BuildingsView onSelectBuilding={handleSelectBuilding} />
          )}
          {activeView === "building-details" && selectedBuildingId && (
            <BuildingDetailsView
              buildingId={selectedBuildingId}
              onBack={handleBackFromBuilding}
            />
          )}
          {activeView === "tenants" && user?.role === "admin" && <TenantsView />}
          {activeView === "interventions" && user?.role === "admin" && <InterventionsView />}
          {activeView === "requests" && user?.role === "admin" && <RequestsView />}
          {activeView === "requests" && user?.role === "tenant" && <TenantRequestsView />}
          {activeView === "services" && user?.role === "admin" && <ServicesView />}
          {activeView === "notifications" && <NotificationsView />}
          {(activeView === "info" || activeView === "informations") && <InformationsView />}
          {activeView === "profile" && user?.role === "tenant" && (
            <div className="p-8">
              <h1 className="text-3xl mb-2 text-foreground">{t("myProfile")}</h1>
              <div className="p-6 rounded-xl border border-border bg-card mt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("name")}</p>
                    <p className="text-lg text-foreground">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("email")}</p>
                    <p className="text-lg text-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("role")}</p>
                    <p className="text-lg text-foreground">{t("tenant")}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
