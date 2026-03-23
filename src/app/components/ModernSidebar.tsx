import React, { useMemo, useState } from "react";
import {
  Building2,
  LayoutDashboard,
  Building,
  Users,
  Wrench,
  Bell,
  Info,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Settings,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

interface ModernSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

type MenuItem = {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export function ModernSidebar({ activeView, onViewChange }: ModernSidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const adminMain: MenuItem[] = useMemo(() => [
    { id: "dashboard", labelKey: "navDashboard", icon: LayoutDashboard },
    { id: "buildings", labelKey: "navBuildings", icon: Building },
    { id: "tenants", labelKey: "navTenants", icon: Users },
    { id: "requests", labelKey: "requestsHub", icon: ClipboardList },
    { id: "interventions", labelKey: "navInterventions", icon: CalendarDays },
    { id: "services", labelKey: "navServices", icon: Briefcase },
  ], []);

  const adminSecondary: MenuItem[] = useMemo(() => [
    { id: "notifications", labelKey: "navNotifications", icon: Bell, badge: 3 },
    { id: "informations", labelKey: "navInformations", icon: Info },
    { id: "settings", labelKey: "navSettings", icon: Settings },
    { id: "support", labelKey: "navSupport", icon: HelpCircle },
  ], []);

  const tenantMain: MenuItem[] = useMemo(() => [
    { id: "dashboard", labelKey: "navHome", icon: LayoutDashboard },
    { id: "requests", labelKey: "navMyRequests", icon: Wrench },
  ], []);

  const tenantSecondary: MenuItem[] = useMemo(() => [
    { id: "notifications", labelKey: "navNotifications", icon: Bell },
    { id: "informations", labelKey: "navInformations", icon: Info },
  ], []);

  const isAdmin = user?.role === "admin";
  const primary = isAdmin ? adminMain : tenantMain;
  const secondary = isAdmin ? adminSecondary : tenantSecondary;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  const w = isCollapsed ? "w-[72px]" : "w-[260px]";

  const NavItem = ({ item }: { item: MenuItem }) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;

    return (
      <button
        type="button"
        onClick={() => onViewChange(item.id)}
        title={isCollapsed ? t(item.labelKey) : undefined}
        className="w-full group"
      >
        <div
          className="flex items-center gap-3 rounded-xl transition-all duration-150"
          style={{
            padding: isCollapsed ? "8px 0" : "8px 12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            background: isActive ? "var(--sidebar-accent)" : "transparent",
            color: isActive ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
            fontWeight: isActive ? 500 : 400,
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = "var(--sidebar-accent)";
              e.currentTarget.style.color = "var(--foreground)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--sidebar-foreground)";
            }
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: isActive ? "var(--sidebar-accent)" : "transparent",
            }}
          >
            <Icon className="w-[18px] h-[18px]" />
          </div>

          {!isCollapsed && (
            <span className="text-[13px] truncate flex-1 text-left leading-tight">
              {t(item.labelKey)}
            </span>
          )}

          {!isCollapsed && item.badge != null && item.badge > 0 && (
            <span
              className="ml-auto shrink-0 rounded-md text-[10px] font-semibold leading-none"
              style={{
                padding: "3px 6px",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {item.badge}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <aside
      className={`${w} h-screen shrink-0 flex flex-col overflow-hidden relative`}
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        transition: "width 200ms ease-out",
      }}
    >
      {/* Brand */}
      <div style={{ padding: isCollapsed ? "24px 12px 20px" : "24px 20px 20px" }}>
        <div
          className="flex items-center"
          style={{
            gap: isCollapsed ? 0 : "12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
          }}
        >
          <div
            className="shrink-0 rounded-xl flex items-center justify-center"
            style={{ width: 36, height: 36, background: "var(--primary)" }}
          >
            <Building2 className="w-[18px] h-[18px]" style={{ color: "var(--primary-foreground)" }} />
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--foreground)" }}>
                ImmoStore
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                Gestion immobilière
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ margin: "0 16px", height: 1, background: "var(--sidebar-border)" }} />

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "16px 12px" }}>
        {!isCollapsed && (
          <p
            className="text-[10px] font-semibold uppercase mb-2"
            style={{ color: "var(--muted-foreground)", padding: "0 12px", letterSpacing: "0.1em" }}
          >
            Principal
          </p>
        )}
        <div className="space-y-0.5">
          {primary.map((item) => <NavItem key={item.id} item={item} />)}
        </div>

        <div style={{ margin: "16px 0", height: 1, background: "var(--sidebar-border)" }} />

        {!isCollapsed && (
          <p
            className="text-[10px] font-semibold uppercase mb-2"
            style={{ color: "var(--muted-foreground)", padding: "0 12px", letterSpacing: "0.1em" }}
          >
            Support
          </p>
        )}
        <div className="space-y-0.5">
          {secondary.map((item) => <NavItem key={item.id} item={item} />)}
        </div>
      </div>

      {/* User section */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)", padding: 12 }}>
        {!isCollapsed ? (
          <div className="rounded-xl" style={{ background: "var(--background)", padding: 12 }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight truncate" style={{ color: "var(--foreground)" }}>
                  {user?.name ?? "—"}
                </p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {user?.email ?? "—"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg text-[13px] transition-colors"
              style={{
                padding: "7px 12px",
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--foreground)";
                e.currentTarget.style.background = "var(--background)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted-foreground)";
                e.currentTarget.style.background = "var(--card)";
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("logout")}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {initials}
            </div>
            <button
              type="button"
              onClick={logout}
              title={t("logout")}
              className="w-full flex items-center justify-center py-2 rounded-lg transition-colors"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--foreground)";
                e.currentTarget.style.background = "var(--sidebar-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted-foreground)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--muted-foreground)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--foreground)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--muted-foreground)";
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        }}
        aria-label={isCollapsed ? "Expand" : "Collapse"}
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
