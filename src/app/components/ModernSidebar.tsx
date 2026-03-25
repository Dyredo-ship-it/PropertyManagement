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
  ChevronUp,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Settings,
  HelpCircle,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Types ───────────────────────────────────────────────────── */

interface ModernSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

type MenuItem = {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  dot?: string; // color string for a dot indicator
};

/* ─── Component ───────────────────────────────────────────────── */

export function ModernSidebar({ activeView, onViewChange }: ModernSidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    management: true,
    support: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const adminSections = useMemo(
    () => [
      {
        key: "management",
        label: "GESTION",
        items: [
          { id: "dashboard", labelKey: "navDashboard", icon: LayoutDashboard },
          { id: "buildings", labelKey: "navBuildings", icon: Building, badge: undefined },
          { id: "tenants", labelKey: "navTenants", icon: Users },
          { id: "requests", labelKey: "requestsHub", icon: ClipboardList },
          { id: "interventions", labelKey: "navInterventions", icon: CalendarDays },
          { id: "services", labelKey: "navServices", icon: Briefcase },
        ] as MenuItem[],
      },
      {
        key: "support",
        label: "SUPPORT",
        items: [
          { id: "notifications", labelKey: "navNotifications", icon: Bell, badge: 3 },
          { id: "informations", labelKey: "navInformations", icon: Info },
          { id: "settings", labelKey: "navSettings", icon: Settings },
          { id: "support", labelKey: "navSupport", icon: HelpCircle },
        ] as MenuItem[],
      },
    ],
    []
  );

  const tenantSections = useMemo(
    () => [
      {
        key: "management",
        label: "PRINCIPAL",
        items: [
          { id: "dashboard", labelKey: "navHome", icon: LayoutDashboard },
          { id: "requests", labelKey: "navMyRequests", icon: Wrench },
        ] as MenuItem[],
      },
      {
        key: "support",
        label: "SUPPORT",
        items: [
          { id: "notifications", labelKey: "navNotifications", icon: Bell },
          { id: "informations", labelKey: "navInformations", icon: Info },
        ] as MenuItem[],
      },
    ],
    []
  );

  const isAdmin = user?.role === "admin";
  const sections = isAdmin ? adminSections : tenantSections;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  const w = isCollapsed ? "w-[72px]" : "w-[260px]";

  return (
    <aside
      className={`${w} h-screen shrink-0 flex flex-col overflow-hidden relative`}
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        transition: "width 200ms ease-out",
      }}
    >
      {/* ── User Profile (top) ──────────────────────────────── */}
      <div style={{ padding: isCollapsed ? "20px 12px 16px" : "20px 16px 16px" }}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[12px] font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-[14px] font-semibold leading-tight truncate"
                style={{ color: "var(--foreground)" }}
              >
                {user?.name ?? "—"}
              </p>
              <p
                className="text-[11px] truncate mt-0.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                {user?.role === "admin" ? "Administrateur" : "Locataire"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sidebar-accent)";
                e.currentTarget.style.color = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--muted-foreground)";
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {initials}
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sidebar-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div style={{ margin: "0 16px", height: 1, background: "var(--sidebar-border)" }} />

      {/* ── Brand ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: isCollapsed ? "16px 12px" : "16px 16px",
        }}
      >
        <div
          className="flex items-center"
          style={{
            gap: isCollapsed ? 0 : 10,
            justifyContent: isCollapsed ? "center" : "flex-start",
          }}
        >
          <div
            className="shrink-0 rounded-lg flex items-center justify-center"
            style={{ width: 32, height: 32, background: "var(--primary)" }}
          >
            <Building2
              className="w-4 h-4"
              style={{ color: "var(--primary-foreground)" }}
            />
          </div>
          {!isCollapsed && (
            <p
              className="text-[14px] font-semibold leading-tight truncate"
              style={{ color: "var(--foreground)" }}
            >
              ImmoStore
            </p>
          )}
        </div>
      </div>

      {/* ── Navigation Sections ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "4px 10px 16px" }}>
        {sections.map((section, idx) => (
          <div key={section.key}>
            {idx > 0 && (
              <div
                style={{
                  margin: "12px 6px",
                  height: 1,
                  background: "var(--sidebar-border)",
                }}
              />
            )}

            {/* Section header */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between mb-1"
                style={{ padding: "4px 10px" }}
              >
                <p
                  className="text-[10px] font-semibold uppercase"
                  style={{
                    color: "var(--muted-foreground)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {section.label}
                </p>
                <ChevronUp
                  className="w-3 h-3 transition-transform"
                  style={{
                    color: "var(--muted-foreground)",
                    transform: openSections[section.key]
                      ? "rotate(0deg)"
                      : "rotate(180deg)",
                  }}
                />
              </button>
            )}

            {/* Items */}
            {(isCollapsed || openSections[section.key]) && (
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={activeView === item.id}
                    isCollapsed={isCollapsed}
                    onClick={() => onViewChange(item.id)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Bottom actions ────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)", padding: "10px" }}>
        {!isCollapsed ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-lg text-[13px] transition-colors"
              style={{
                padding: "8px 10px",
                color: "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sidebar-accent)";
                e.currentTarget.style.color = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--muted-foreground)";
              }}
            >
              <LogOut className="w-4 h-4" />
              <span>{t("logout")}</span>
            </button>
          </div>
        ) : (
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
        )}

        {/* Version */}
        {!isCollapsed && (
          <p
            className="text-[10px] text-center mt-2"
            style={{ color: "var(--muted-foreground)", opacity: 0.5 }}
          >
            ImmoStore v1.0
          </p>
        )}
      </div>
    </aside>
  );
}

/* ─── NavItem ─────────────────────────────────────────────────── */

function NavItem({
  item,
  isActive,
  isCollapsed,
  onClick,
  t,
}: {
  item: MenuItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  t: (key: string) => string;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      title={isCollapsed ? t(item.labelKey) : undefined}
      className="w-full"
    >
      <div
        className="flex items-center gap-3 rounded-lg transition-all duration-150"
        style={{
          padding: isCollapsed ? "8px 0" : "7px 10px",
          justifyContent: isCollapsed ? "center" : "flex-start",
          background: isActive ? "var(--sidebar-accent)" : "transparent",
          color: isActive
            ? "var(--sidebar-accent-foreground)"
            : "var(--sidebar-foreground)",
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
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0">
          <Icon className="w-[17px] h-[17px]" />
        </div>

        {!isCollapsed && (
          <span className="text-[13px] truncate flex-1 text-left leading-tight">
            {t(item.labelKey)}
          </span>
        )}

        {/* Badge (count) */}
        {!isCollapsed && item.badge != null && item.badge > 0 && (
          <span
            className="ml-auto shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold leading-none"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {item.badge}
          </span>
        )}

        {/* Dot indicator */}
        {!isCollapsed && item.dot && (
          <span
            className="ml-auto shrink-0 w-2 h-2 rounded-full"
            style={{ background: item.dot }}
          />
        )}

        {/* Collapsed badge dot */}
        {isCollapsed && item.badge != null && item.badge > 0 && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: "#EF4444" }}
          />
        )}
      </div>
    </button>
  );
}
