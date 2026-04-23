import React from "react";
import {
  LayoutDashboard,
  Building,
  Users,
  ClipboardList,
  Receipt,
  Sparkles,
} from "lucide-react";
import { useAuth, useCan } from "../context/AuthContext";
import type { FeatureKey } from "../lib/permissions";

interface MobileBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

type NavEntry = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: FeatureKey;
  action?: "open-ai";
};

// Six-slot layout on mobile — Assistant sits at the far right as a
// distinctive primary-tinted tab (replaces the old floating bubble).
const ADMIN_ENTRIES: NavEntry[] = [
  { id: "dashboard", label: "Accueil", icon: LayoutDashboard, feature: "dashboard" },
  { id: "buildings", label: "Immeubles", icon: Building, feature: "buildings" },
  { id: "tenants", label: "Locataires", icon: Users, feature: "tenants" },
  { id: "requests", label: "Demandes", icon: ClipboardList, feature: "requests" },
  { id: "accounting", label: "Compta", icon: Receipt, feature: "accounting" },
  { id: "ai", label: "Assistant", icon: Sparkles, action: "open-ai" },
];

const TENANT_ENTRIES: NavEntry[] = [
  { id: "dashboard", label: "Accueil", icon: LayoutDashboard },
  { id: "requests", label: "Demandes", icon: ClipboardList },
];

/**
 * Fixed bottom nav shown only below the lg breakpoint. Desktop rendering
 * is suppressed via the .lg:hidden utility (see theme.css media query).
 */
export function MobileBottomNav({ activeView, onViewChange }: MobileBottomNavProps) {
  const { user } = useAuth();
  const can = useCan();
  if (!user) return null;

  const entries = user.role === "tenant" ? TENANT_ENTRIES : ADMIN_ENTRIES;
  const visible = entries.filter((e) => (e.feature ? can(e.feature, "read") : true));
  if (visible.length === 0) return null;

  return (
    <nav
      className="mobile-bottom-nav lg:hidden"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 130,
        background: "var(--card)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "stretch",
        padding: "6px 2px calc(6px + env(safe-area-inset-bottom))",
        boxShadow: "0 -6px 20px rgba(0,0,0,0.06)",
      }}
    >
      {visible.map((e) => {
        const Icon = e.icon;
        const active = activeView === e.id;
        const isAction = e.action === "open-ai";
        return (
          <button
            key={e.id}
            onClick={() => {
              if (isAction) {
                window.dispatchEvent(new CustomEvent("palier:open-ai"));
              } else {
                onViewChange(e.id);
              }
            }}
            style={{
              flex: "1 1 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "6px 0",
              border: "none",
              background: "transparent",
              color: isAction
                ? "var(--primary)"
                : active
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              minWidth: 0,
              position: "relative",
            }}
          >
            {isAction ? (
              <span
                aria-hidden
                style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--primary)",
                }}
              >
                <Icon className="w-[18px] h-[18px]" />
              </span>
            ) : (
              <Icon className="w-5 h-5" />
            )}
            <span style={{ fontSize: 10, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
              {e.label}
            </span>
            {active && !isAction && (
              <span
                style={{
                  position: "absolute", top: 0, left: "30%", right: "30%", height: 2,
                  background: "var(--primary)", borderRadius: 0,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
