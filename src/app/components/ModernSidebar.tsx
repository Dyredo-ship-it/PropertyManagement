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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

interface ModernSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

type MenuItem = {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function ModernSidebar({ activeView, onViewChange }: ModernSidebarProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const adminMenuItems: MenuItem[] = useMemo(
    () => [
      { id: "dashboard", labelKey: "navDashboard", icon: LayoutDashboard },
      { id: "buildings", labelKey: "navBuildings", icon: Building },
      { id: "tenants", labelKey: "navTenants", icon: Users },
      { id: "requests", labelKey: "requestsHub", icon: ClipboardList },
      { id: "interventions", labelKey: "navInterventions", icon: CalendarDays },
      { id: "services", labelKey: "navServices", icon: Briefcase },
      { id: "notifications", labelKey: "navNotifications", icon: Bell },
      { id: "informations", labelKey: "navInformations", icon: Info },
    ],
    [],
  );

  const tenantMenuItems: MenuItem[] = useMemo(
    () => [
      { id: "dashboard", labelKey: "navHome", icon: LayoutDashboard },
      { id: "requests", labelKey: "navMyRequests", icon: Wrench },
      { id: "notifications", labelKey: "navNotifications", icon: Bell },
      { id: "informations", labelKey: "navInformations", icon: Info },
    ],
    [],
  );

  const menuItems = user?.role === "admin" ? adminMenuItems : tenantMenuItems;
  const sidebarWidth = isCollapsed ? "w-20" : "w-72";

  return (
    <aside
      className={[
        sidebarWidth,
        "h-screen shrink-0",
        "bg-sidebar",
        "border-r border-sidebar-border",
        "overflow-hidden",
        "relative",
        "transition-[width] duration-200 ease-out",
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-5 border-b border-white/15">
        <div className={["flex items-center", isCollapsed ? "justify-center" : "gap-3"].join(" ")}>
          <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white/90" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 overflow-hidden">
              <div className="text-[17px] font-semibold text-white leading-tight truncate">
                {t("appName")}
              </div>
              <div className="text-xs text-white/60 mt-0.5 truncate">
                {user?.role === "admin" ? t("admin") : t("tenant")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                title={isCollapsed ? t(item.labelKey) : undefined}
                className={[
                  "w-full",
                  "flex items-center",
                  isCollapsed ? "justify-center px-0" : "gap-3 px-4",
                  "py-2.5",
                  "rounded-xl",
                  "transition-colors",
                  "min-h-[42px]",
                  isActive
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/70 hover:bg-white/8 hover:text-white",
                ].join(" ")}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm truncate whitespace-nowrap">
                    {t(item.labelKey)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/15 p-3">
        {!isCollapsed ? (
          <>
            <div className="rounded-xl border border-white/10 bg-white/8 p-3 mb-2 overflow-hidden">
              <div className="text-xs text-white/50">{t("loggedInAs")}</div>
              <div className="text-sm text-white/90 font-medium truncate mt-0.5">
                {user?.name ?? "—"}
              </div>
              <div className="text-xs text-white/50 truncate">
                {user?.email ?? "—"}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/8 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              <span className="text-sm truncate">{t("logout")}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/8 transition-colors"
            title={t("logout")}
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className={[
          "absolute -right-3 top-20",
          "w-6 h-6 rounded-full",
          "bg-sidebar border border-border",
          "flex items-center justify-center",
          "text-white hover:bg-[#3a4930]",
          "shadow-md",
          "transition-colors",
          "z-10",
        ].join(" ")}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
