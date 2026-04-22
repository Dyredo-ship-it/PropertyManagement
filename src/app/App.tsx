import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth, useCan } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { BiometricLock } from "./components/BiometricLock";
import { biometricEnabled } from "./lib/biometric";
import { hydrateFromSupabase, clearStorageCache } from "./utils/storage";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import { LoginPage } from "./components/LoginPage";
import { AcceptInvitePage } from "./components/AcceptInvitePage";
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
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { SettingsView } from "./components/SettingsView";
import { CalendarView } from "./components/CalendarView";
import { AccountingView } from "./components/AccountingView";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { AIChatPanel } from "./components/AIChatPanel";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { getBuildings, getTenants } from "./utils/storage";

function AppContent() {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [billingNotice, setBillingNotice] = useState<"success" | "canceled" | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    "profile" | "security" | "notifications" | "appearance" | "billing" | "company" | undefined
  >(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const can = useCan();

  // Hydrate the local cache from Supabase once authenticated. We run this
  // exactly once per login; further auth state changes (token refresh, etc.)
  // don't re-trigger hydration.
  useEffect(() => {
    if (!isAuthenticated) {
      clearStorageCache();
      setDataReady(false);
      return;
    }
    let cancelled = false;
    hydrateFromSupabase().finally(() => {
      if (!cancelled) setDataReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // First-time onboarding for admins: triggered when the user has no buildings
  // and no tenants, gated by a localStorage flag so we never show it twice.
  // Use ?onboarding=force in the URL to preview the wizard for testing.
  useEffect(() => {
    if (!isAuthenticated || !dataReady || !user) return;
    if (user.role !== "admin") return;
    const force = new URLSearchParams(window.location.search).get("onboarding") === "force";
    if (force) {
      setShowOnboarding(true);
      return;
    }
    const key = `palier_onboarded_${user.id}`;
    const legacyKey = `immostore_onboarded_${user.id}`;
    if (localStorage.getItem(key) || localStorage.getItem(legacyKey)) return;
    const hasData = getBuildings().length > 0 || getTenants().length > 0;
    if (hasData) {
      localStorage.setItem(key, "1");
      return;
    }
    setShowOnboarding(true);
  }, [isAuthenticated, dataReady, user]);

  const handleFinishOnboarding = () => {
    if (user) localStorage.setItem(`palier_onboarded_${user.id}`, "1");
    setShowOnboarding(false);
  };

  // Listen for in-app navigation requests to the billing tab (e.g. from
  // PlanLimitModal "Voir les plans" button).
  useEffect(() => {
    const handler = () => {
      setActiveView("settings");
      setSettingsInitialTab("billing");
    };
    window.addEventListener("navigate-to-billing", handler);
    return () => window.removeEventListener("navigate-to-billing", handler);
  }, []);

  // Handle Stripe billing redirect (?billing=success or ?billing=canceled)
  useEffect(() => {
    if (!isAuthenticated || !dataReady) return;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing !== "success" && billing !== "canceled") return;
    setBillingNotice(billing);
    setActiveView("settings");
    setSettingsInitialTab("billing");
    params.delete("billing");
    const newSearch = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (newSearch ? `?${newSearch}` : ""),
    );
    const t = setTimeout(() => setBillingNotice(null), 6000);
    return () => clearTimeout(t);
  }, [isAuthenticated, dataReady]);

  // Handle team invitation acceptance via ?invite_token=... in the URL.
  // Works when the user is already logged in. If unauthenticated, the
  // token stays in the URL and LoginPage picks it up after signup/login.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite_token");
    if (!token) return;
    (async () => {
      try {
        const { supabase } = await import("./lib/supabase");
        const { error } = await supabase.rpc("accept_organization_invitation", { p_token: token });
        if (error) throw error;
        // Scrub the token from the URL and refresh the session so the
        // profile now reflects the new org + permissions.
        params.delete("invite_token");
        const newSearch = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
        alert("Invitation acceptée — vous rejoignez la régie.");
        window.location.reload();
      } catch (err) {
        alert(`Impossible d'accepter l'invitation : ${(err as Error).message}`);
        params.delete("invite_token");
        const newSearch = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
      }
    })();
  }, [isAuthenticated, user]);

  if (loading || (isAuthenticated && !dataReady)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!isAuthenticated) {
    // If the URL carries a pending invitation token, show the dedicated
    // accept flow instead of the generic login/signup screen — it ties
    // the account creation to the invited email + org, rather than
    // letting anyone create a fresh organization.
    const inviteToken =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("invite_token")
        : null;
    if (inviteToken) {
      return <AcceptInvitePage token={inviteToken} />;
    }
    return <LoginPage />;
  }

  // Biometric app lock — only if the user enabled it previously on this
  // device. Cleared on logout (the lib's storage key stays, but the user
  // must re-auth via email first to reach this screen).
  if (user && biometricEnabled(user.id) && !biometricUnlocked) {
    return (
      <BiometricLock
        onUnlock={() => setBiometricUnlocked(true)}
        onSignOut={() => {
          setBiometricUnlocked(false);
          void logout();
        }}
      />
    );
  }

  const handleSelectBuilding = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setActiveView("buildings");
  };

  const handleBackFromBuilding = () => {
    setSelectedBuildingId(null);
    setActiveView("buildings");
  };

  return (
    <div className="flex h-screen bg-background">
      <ModernSidebar
        activeView={activeView}
        onViewChange={(v) => {
          setActiveView(v);
          if (v !== "buildings") setSelectedBuildingId(null);
          if (v !== "settings") setSettingsInitialTab(undefined);
        }}
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader
          onNavigate={setActiveView}
          onToggleSidebar={() => setSidebarMobileOpen((v) => !v)}
        />

        {billingNotice && (
          <div
            style={{
              padding: "12px 24px",
              background:
                billingNotice === "success" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
              color: billingNotice === "success" ? "#15803D" : "#B45309",
              fontSize: 13,
              fontWeight: 500,
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {billingNotice === "success"
                ? "✓ Abonnement activé avec succès. Bienvenue !"
                : "Paiement annulé. Aucun changement n'a été effectué."}
            </span>
            <button
              type="button"
              onClick={() => setBillingNotice(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
              }}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-background has-mobile-bottom-nav">
          {activeView === "dashboard" && user?.role === "admin" && can("dashboard") && <DashboardView onSelectBuilding={handleSelectBuilding} />}
          {activeView === "dashboard" && user?.role === "tenant" && <TenantDashboardView />}
          {activeView === "buildings" && user?.role === "admin" && can("buildings") && (
            <BuildingsView onSelectBuilding={handleSelectBuilding} initialSelectedId={selectedBuildingId} />
          )}
          {activeView === "building-details" && selectedBuildingId && can("buildings") && (
            <BuildingDetailsView
              buildingId={selectedBuildingId}
              onBack={handleBackFromBuilding}
            />
          )}
          {activeView === "tenants" && user?.role === "admin" && can("tenants") && <TenantsView />}
          {activeView === "interventions" && user?.role === "admin" && can("interventions") && <InterventionsView />}
          {activeView === "requests" && user?.role === "admin" && can("requests") && <RequestsView />}
          {activeView === "requests" && user?.role === "tenant" && <TenantRequestsView />}
          {activeView === "services" && <ServicesView />}
          {activeView === "analytics" && user?.role === "admin" && can("analytics") && <AnalyticsDashboard />}
          {activeView === "calendar" && user?.role === "admin" && can("calendar") && <CalendarView />}
          {activeView === "accounting" && user?.role === "admin" && can("accounting") && <AccountingView />}
          {activeView === "settings" && <SettingsView initialTab={settingsInitialTab} />}
          {activeView === "notifications" && <NotificationsView onNavigate={setActiveView} />}
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

      {showOnboarding && user && (
        <OnboardingWizard userName={user.name ?? user.email} onFinish={handleFinishOnboarding} />
      )}
      <AIChatPanel />
      <PwaUpdatePrompt />
      <MobileBottomNav
        activeView={activeView}
        onViewChange={(v) => {
          setActiveView(v);
          if (v !== "buildings") setSelectedBuildingId(null);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <NotificationsProvider>
              <AppContent />
            </NotificationsProvider>
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
