import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Building,
  Users,
  Wrench,
  Bell,
  Info,
  LogOut,
  ChevronDown,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Settings,
  HelpCircle,
  BarChart3,
  Search,
  MoreVertical,
  Receipt,
} from "lucide-react";
import { useAuth, useCan } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { useLanguage } from "../i18n/LanguageContext";
import { PalierLogo } from "./PalierLogo";
import { fetchSubscription, PLANS, type SubscriptionInfo } from "../lib/billing";
import type { FeatureKey } from "../lib/permissions";

/* ─── Types ───────────────────────────────────────────────────── */

interface ModernSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  /** Whether the drawer variant is open (mobile). Always visible on desktop. */
  mobileOpen?: boolean;
  /** Called to close the drawer on mobile (backdrop tap or item click). */
  onMobileClose?: () => void;
}

type MenuItem = {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: number;
  feature?: FeatureKey; // if set, the item is hidden when user lacks read on it
  children?: { id: string; labelKey: string; feature?: FeatureKey }[];
};

type Section = {
  key: string;
  items: MenuItem[];
};

/* ─── Component ───────────────────────────────────────────────── */

export function ModernSidebar({ activeView, onViewChange, mobileOpen = false, onMobileClose }: ModernSidebarProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const can = useCan();
  const [searchQuery, setSearchQuery] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setSubscription(null);
      return;
    }
    let cancelled = false;
    fetchSubscription().then((s) => {
      if (!cancelled) setSubscription(s);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const planBadge = useMemo(() => {
    if (!subscription) return null;
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    if (!isActive) return null;
    const plan = PLANS.find((p) => p.id === subscription.plan);
    if (!plan) return null;
    const colors: Record<string, { bg: string; fg: string }> = {
      starter: { bg: "rgba(148,163,184,0.18)", fg: "#475569" },
      pro: { bg: "rgba(99,102,241,0.15)", fg: "#4338CA" },
      business: { bg: "rgba(234,179,8,0.18)", fg: "#A16207" },
    };
    return { label: plan.name, ...colors[plan.id] };
  }, [subscription]);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) =>
    setExpandedMenus((prev) => ({ ...prev, [id]: !prev[id] }));

  const adminSections = useMemo<Section[]>(
    () => [
      {
        key: "main",
        items: [
          { id: "dashboard", labelKey: "navDashboard", icon: LayoutDashboard, feature: "dashboard" },
          {
            id: "buildings",
            labelKey: "navBuildings",
            icon: Building,
            feature: "buildings",
            children: [
              { id: "buildings", labelKey: "navBuildings", feature: "buildings" },
              { id: "analytics", labelKey: "navAnalytics", feature: "analytics" },
            ],
          },
          { id: "tenants", labelKey: "navTenants", icon: Users, feature: "tenants" },
          {
            id: "requests",
            labelKey: "requestsHub",
            icon: ClipboardList,
            feature: "requests",
            children: [
              { id: "requests", labelKey: "requestsHub", feature: "requests" },
              { id: "interventions", labelKey: "navInterventions", feature: "interventions" },
            ],
          },
          { id: "services", labelKey: "navServices", icon: Briefcase, feature: "services" },
          { id: "calendar", labelKey: "navCalendar", icon: CalendarDays, feature: "calendar" },
          { id: "accounting", labelKey: "navAccounting", icon: Receipt, feature: "accounting" },
        ],
      },
      {
        key: "comms",
        items: [
          { id: "notifications", labelKey: "navNotifications", icon: Bell, badge: unreadCount },
          { id: "informations", labelKey: "navInformations", icon: Info },
        ],
      },
      {
        key: "system",
        items: [
          { id: "settings", labelKey: "navSettings", icon: Settings, feature: "settings" },
          { id: "support", labelKey: "navSupport", icon: HelpCircle },
        ],
      },
    ],
    [unreadCount]
  );

  const tenantSections = useMemo<Section[]>(
    () => [
      {
        key: "main",
        items: [
          { id: "dashboard", labelKey: "navHome", icon: LayoutDashboard },
          { id: "requests", labelKey: "navMyRequests", icon: Wrench },
          { id: "services", labelKey: "navServices", icon: Briefcase },
        ],
      },
      {
        key: "comms",
        items: [
          { id: "notifications", labelKey: "navNotifications", icon: Bell, badge: unreadCount },
          { id: "informations", labelKey: "navInformations", icon: Info },
        ],
      },
    ],
    [unreadCount]
  );

  const isAdmin = user?.role === "admin";
  const sections = isAdmin ? adminSections : tenantSections;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  // Filter nav items by search, then gate by permissions.
  const filterItems = (items: MenuItem[]) => {
    const matchSearch = searchQuery.trim()
      ? items.filter(
          (item) =>
            t(item.labelKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.children?.some((c) => t(c.labelKey).toLowerCase().includes(searchQuery.toLowerCase())),
        )
      : items;
    // Admin items may declare a `feature` key; if the user lacks at least
    // read access, the item is hidden. Children are filtered the same way;
    // if every child is gated out, the parent disappears too.
    return matchSearch
      .map((item) => {
        if (item.children) {
          const visibleChildren = item.children.filter((c) => !c.feature || can(c.feature, "read"));
          return { ...item, children: visibleChildren };
        }
        return item;
      })
      .filter((item) => {
        if (item.children) return item.children.length > 0;
        if (!item.feature) return true;
        return can(item.feature, "read");
      });
  };

  // Intercept nav clicks so the mobile drawer closes after navigation.
  const go = (view: string) => {
    onViewChange(view);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop — tap to close the drawer. */}
      <div
        onClick={onMobileClose}
        style={{
          position: "fixed", inset: 0, zIndex: 140,
          background: "rgba(0,0,0,0.35)",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 0.2s ease",
          display: "block",
        }}
        className="lg:hidden"
      />
      <aside
        className={`modern-sidebar ${mobileOpen ? "is-open" : ""}`}
        style={{
          width: 260,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--card)",
          borderRight: "1px solid var(--border)",
          flexShrink: 0,
          overflow: "hidden",
          position: "relative",
          zIndex: 150,
        }}
      >
      {/* ── Logo ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "22px 20px 16px",
          display: "flex",
          alignItems: "center",
          gap: 11,
        }}
      >
        <PalierLogo size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--foreground)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Palier
          </p>
          <p
            style={{
              fontSize: 10,
              color: "var(--muted-foreground)",
              margin: 0,
              marginTop: 1,
            }}
          >
            Gestion immobilière
          </p>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div style={{ padding: "0 14px 12px" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            style={{
              position: "absolute",
              left: 11,
              width: 15,
              height: 15,
              color: "var(--muted-foreground)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder={t("searchPlaceholder") || "Search"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              height: 36,
              paddingLeft: 34,
              paddingRight: 12,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: 12,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 10px",
        }}
      >
        {sections.map((section, sIdx) => {
          const filtered = filterItems(section.items);
          if (filtered.length === 0) return null;
          return (
            <div key={section.key}>
              {sIdx > 0 && (
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "10px 8px",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filtered.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    activeView={activeView}
                    expanded={!!expandedMenus[item.id]}
                    onToggleExpand={() => toggleExpand(item.id)}
                    onNavigate={go}
                    t={t}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User profile at bottom ──────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--foreground)",
                  margin: 0,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {user?.name ?? "—"}
              </p>
              {planBadge && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: planBadge.bg,
                    color: planBadge.fg,
                    lineHeight: 1.2,
                  }}
                >
                  {planBadge.label}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.email ?? "—"}
            </p>
          </div>

          {/* Menu / logout button */}
          <button
            type="button"
            onClick={logout}
            title={t("logout")}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--background)";
              e.currentTarget.style.color = "var(--foreground)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted-foreground)";
            }}
          >
            <MoreVertical style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {/* Build id footer — lets the user tell which deploy they're on */}
        <div
          style={{
            padding: "0 20px 10px",
            fontSize: 9,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "var(--muted-foreground)",
            opacity: 0.6,
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
          title="Identifiant de build"
        >
          v.{typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev"}
        </div>
      </div>
      </aside>
    </>
  );
}

/* ─── NavItem ─────────────────────────────────────────────────── */

function NavItem({
  item,
  activeView,
  expanded,
  onToggleExpand,
  onNavigate,
  t,
}: {
  item: MenuItem;
  activeView: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (id: string) => void;
  t: (key: string) => string;
}) {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeView === item.id ||
    (hasChildren && item.children!.some((c) => c.id === activeView));

  const handleClick = () => {
    if (hasChildren) {
      onToggleExpand();
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          transition: "background 0.12s, color 0.12s",
          background: isActive && !hasChildren ? "var(--sidebar-accent)" : "transparent",
          color: isActive ? "var(--primary)" : "var(--muted-foreground)",
          fontWeight: isActive ? 600 : 400,
        }}
        onMouseEnter={(e) => {
          if (!(isActive && !hasChildren)) {
            e.currentTarget.style.background = "var(--background)";
          }
        }}
        onMouseLeave={(e) => {
          if (!(isActive && !hasChildren)) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <Icon
          style={{ width: 18, height: 18, flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: 13,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {t(item.labelKey)}
        </span>

        {/* Badge */}
        {item.badge != null && item.badge > 0 && (
          <span
            style={{
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: "#EF4444",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
              flexShrink: 0,
            }}
          >
            {item.badge}
          </span>
        )}

        {/* Expand chevron */}
        {hasChildren && (
          <ChevronDown
            style={{
              width: 14,
              height: 14,
              flexShrink: 0,
              transition: "transform 0.15s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              color: "var(--muted-foreground)",
            }}
          />
        )}
      </button>

      {/* Submenu */}
      {hasChildren && expanded && (
        <div style={{ paddingLeft: 20, marginTop: 2 }}>
          {item.children!.map((child) => {
            const childActive = activeView === child.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => onNavigate(child.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: childActive ? "var(--sidebar-accent)" : "transparent",
                  color: childActive ? "var(--primary)" : "var(--muted-foreground)",
                  fontWeight: childActive ? 600 : 400,
                  fontSize: 12,
                  transition: "background 0.12s",
                  borderLeft: childActive
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!childActive) e.currentTarget.style.background = "var(--background)";
                }}
                onMouseLeave={(e) => {
                  if (!childActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {t(child.labelKey)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
