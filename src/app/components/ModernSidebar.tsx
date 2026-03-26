import React, { useMemo, useState } from "react";
import {
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
  BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { ImmoStoreLogo } from "./ImmoStoreLogo";

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

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const adminSections = useMemo(
    () => [
      {
        key: "management",
        label: "GESTION",
        items: [
          { id: "dashboard", labelKey: "navDashboard", icon: LayoutDashboard },
          { id: "buildings", labelKey: "navBuildings", icon: Building },
          { id: "tenants", labelKey: "navTenants", icon: Users },
          { id: "requests", labelKey: "requestsHub", icon: ClipboardList },
          { id: "interventions", labelKey: "navInterventions", icon: CalendarDays },
          { id: "services", labelKey: "navServices", icon: Briefcase },
          { id: "analytics", labelKey: "navAnalytics", icon: BarChart3 },
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
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
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
      {/* ── Brand + Logo ──────────────────────────────────────── */}
      <div style={{ padding: isCollapsed ? "20px 12px 12px" : "20px 18px 12px" }}>
        <div
          className="flex items-center"
          style={{
            gap: isCollapsed ? 0 : 12,
            justifyContent: isCollapsed ? "center" : "flex-start",
          }}
        >
          <ImmoStoreLogo size={isCollapsed ? 34 : 36} />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p
                className="text-[15px] font-bold leading-tight truncate"
                style={{ color: "var(--foreground)" }}
              >
                ImmoStore
              </p>
              <p
                className="text-[10px] mt-0.5 truncate"
                style={{ color: "var(--muted-foreground)" }}
              >
                Gestion immobilière
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── User bubble ───────────────────────────────────────── */}
      <div style={{ padding: isCollapsed ? "8px 10px 12px" : "8px 14px 12px" }}>
        <div
          className="flex items-center transition-colors cursor-pointer"
          style={{
            gap: isCollapsed ? 0 : 10,
            justifyContent: isCollapsed ? "center" : "flex-start",
            padding: isCollapsed ? "8px 0" : "10px 12px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.65)",
            border: "1px solid rgba(255,255,255,0.8)",
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {initials}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p
                className="text-[13px] font-semibold leading-tight truncate"
                style={{ color: "var(--foreground)" }}
              >
                {user?.name ?? "—"}
              </p>
              <p
                className="text-[10px] truncate mt-0.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                {user?.role === "admin" ? "Administrateur" : "Locataire"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ margin: "0 16px 4px", height: 1, background: "var(--sidebar-border)" }} />

      {/* ── Navigation Sections ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "8px 10px 16px" }}>
        {sections.map((section, idx) => (
          <div key={section.key}>
            {idx > 0 && (
              <div
                style={{
                  margin: "10px 8px",
                  height: 1,
                  background: "var(--sidebar-border)",
                }}
              />
            )}

            {/* Section header with chevron */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between mb-1.5"
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
                    transform: openSections[section.key] ? "rotate(0deg)" : "rotate(180deg)",
                  }}
                />
              </button>
            )}

            {/* Nav items as bubbles */}
            {(isCollapsed || openSections[section.key]) && (
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavBubble
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

      {/* ── Bottom: Logout ────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)", padding: 10 }}>
        <button
          type="button"
          onClick={logout}
          title={isCollapsed ? t("logout") : undefined}
          className="w-full flex items-center gap-3 transition-colors"
          style={{
            padding: isCollapsed ? "8px 0" : "8px 12px",
            justifyContent: isCollapsed ? "center" : "flex-start",
            borderRadius: 12,
            color: "var(--muted-foreground)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="text-[13px]">{t("logout")}</span>}
        </button>

        {!isCollapsed && (
          <p
            className="text-[10px] text-center mt-2"
            style={{ color: "var(--muted-foreground)", opacity: 0.4 }}
          >
            ImmoStore v1.0
          </p>
        )}
      </div>

      {/* ── Collapse toggle ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--muted-foreground)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--foreground)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--muted-foreground)";
          e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
        }}
        aria-label={isCollapsed ? "Expand" : "Collapse"}
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

/* ─── NavBubble — pill-shaped navigation item ─────────────────── */

function NavBubble({
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
        className="flex items-center gap-3 transition-all duration-150"
        style={{
          padding: isCollapsed ? "8px 0" : "8px 12px",
          justifyContent: isCollapsed ? "center" : "flex-start",
          borderRadius: 12,
          background: isActive ? "rgba(255,255,255,0.7)" : "transparent",
          color: isActive ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
          fontWeight: isActive ? 600 : 400,
          boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
          border: isActive ? "1px solid rgba(255,255,255,0.6)" : "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "rgba(255,255,255,0.4)";
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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
          <Icon className="w-[17px] h-[17px]" />
        </div>

        {!isCollapsed && (
          <span className="text-[13px] truncate flex-1 text-left leading-tight">
            {t(item.labelKey)}
          </span>
        )}

        {!isCollapsed && item.badge != null && item.badge > 0 && (
          <span
            className="ml-auto shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold leading-none"
            style={{
              background: "#EF4444",
              color: "#FFFFFF",
            }}
          >
            {item.badge}
          </span>
        )}
      </div>
    </button>
  );
}
