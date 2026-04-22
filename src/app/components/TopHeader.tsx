import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Globe,
  Check,
  Wrench,
  FileText,
  MessageSquare,
  AlertCircle,
  X,
  Building2,
  Users,
  ClipboardList,
  ChevronRight,
  ScanLine,
  Menu,
} from "lucide-react";
import { DocumentScanner } from "./DocumentScanner";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";
import {
  getBuildings,
  getTenants,
  getMaintenanceRequests,
  type Building,
  type Tenant,
  type MaintenanceRequest,
  type NotificationCategory,
} from "../utils/storage";

/* ─── Notification UI helpers ────────────────────────────────── */

const notifIcon = (category?: NotificationCategory) => {
  const cls = "w-4 h-4";
  if (category === "maintenance") return <Wrench className={cls} />;
  if (category === "payment") return <FileText className={cls} />;
  if (category === "inspection") return <ClipboardList className={cls} />;
  if (category === "urgent") return <AlertCircle className={cls} />;
  return <MessageSquare className={cls} />;
};

const notifColor = (category?: NotificationCategory) => {
  if (category === "maintenance") return { bg: "rgba(245,158,11,0.10)", color: "#B45309" };
  if (category === "payment") return { bg: "rgba(59,130,246,0.10)", color: "#1D4ED8" };
  if (category === "inspection") return { bg: "rgba(16,185,129,0.10)", color: "#047857" };
  if (category === "urgent") return { bg: "rgba(239,68,68,0.10)", color: "#DC2626" };
  return { bg: "rgba(139,92,246,0.10)", color: "#6D28D9" };
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString("fr-CH", { day: "2-digit", month: "short" });
}

/* ─── Component ──────────────────────────────────────────────── */

type SearchResult = {
  id: string;
  type: "building" | "tenant" | "request";
  title: string;
  subtitle: string;
  view: string;
};

export function TopHeader({
  onNavigate,
  onToggleSidebar,
}: {
  onNavigate?: (view: string) => void;
  onToggleSidebar?: () => void;
}) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Live network status — surfaces a subtle offline pill when navigator
  // loses connectivity so users know writes won't sync yet.
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const notifs = notifications;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  /* ─── Global search across all data ─── */
  const searchResults = useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: SearchResult[] = [];

    try {
      // Search buildings
      const buildings = getBuildings();
      for (const b of buildings) {
        if (b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q)) {
          results.push({
            id: `b-${b.id}`, type: "building",
            title: b.name,
            subtitle: b.address,
            view: "buildings",
          });
        }
        if (results.length >= 8) break;
      }

      // Search tenants
      const tenants = getTenants() as any[];
      for (const tn of tenants) {
        if (
          (tn.name ?? "").toLowerCase().includes(q) ||
          (tn.email ?? "").toLowerCase().includes(q) ||
          (tn.phone ?? "").toLowerCase().includes(q) ||
          (tn.unit ?? "").toLowerCase().includes(q)
        ) {
          results.push({
            id: `t-${tn.id}`, type: "tenant",
            title: tn.name ?? "",
            subtitle: `${tn.buildingName ?? ""} · ${t("unit")} ${tn.unit ?? ""}`,
            view: "tenants",
          });
        }
        if (results.length >= 8) break;
      }

      // Search requests
      const requests = getMaintenanceRequests();
      for (const r of requests) {
        if (
          (r.title ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q)
        ) {
          results.push({
            id: `r-${r.id}`, type: "request",
            title: r.title ?? "",
            subtitle: `${r.status} · ${r.priority ?? ""}`,
            view: "requests",
          });
        }
        if (results.length >= 8) break;
      }
    } catch { /* storage access may fail */ }

    return results.slice(0, 8);
  }, [searchQuery, t]);

  const showResults = isSearchFocused && searchQuery.trim().length >= 2;

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setIsLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearchFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    markAllAsRead();
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <header
      className="shrink-0 flex items-center gap-2 sm:gap-4"
      style={{
        height: 64,
        padding: "0 12px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}
    >
      {/* Mobile hamburger — hidden on lg+. */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden"
          title="Menu"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 10,
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--foreground)", cursor: "pointer", flexShrink: 0,
          }}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Search */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 440, position: "relative" }}>
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              width: 15, height: 15, color: "var(--muted-foreground)", pointerEvents: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setIsSearchFocused(false); }}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                width: 22, height: 22, borderRadius: 6, border: "none",
                background: "transparent", color: "var(--muted-foreground)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder={t("searchPlaceholder")}
            style={{
              width: "100%", fontSize: 13, outline: "none",
              padding: "8px 32px 8px 36px",
              borderRadius: 12,
              border: isSearchFocused ? "1px solid var(--primary)" : "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              boxShadow: isSearchFocused ? "0 0 0 3px rgba(69,85,58,0.08)" : "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                setIsSearchFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>

        {/* ─── Search results dropdown ─── */}
        {showResults && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
              borderRadius: 16, overflow: "hidden",
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
              zIndex: 60,
            }}
          >
            {searchResults.length > 0 ? (
              <>
                {/* Group by type */}
                {(["building", "tenant", "request"] as const).map((type) => {
                  const group = searchResults.filter((r) => r.type === type);
                  if (group.length === 0) return null;

                  const cfg = {
                    building: {
                      icon: <Building2 style={{ width: 14, height: 14 }} />,
                      label: t("navBuildings"),
                      color: "var(--primary)",
                      bg: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    },
                    tenant: {
                      icon: <Users style={{ width: 14, height: 14 }} />,
                      label: t("tenantCount"),
                      color: "#6D28D9",
                      bg: "rgba(139,92,246,0.08)",
                    },
                    request: {
                      icon: <ClipboardList style={{ width: 14, height: 14 }} />,
                      label: t("requests"),
                      color: "#B45309",
                      bg: "rgba(245,158,11,0.08)",
                    },
                  }[type];

                  return (
                    <div key={type}>
                      {/* Section header */}
                      <div style={{
                        padding: "10px 16px 6px",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: cfg.bg, color: cfg.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {cfg.icon}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: "0.06em", color: "var(--muted-foreground)",
                        }}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Results */}
                      {group.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            if (onNavigate) onNavigate(result.view);
                            setSearchQuery("");
                            setIsSearchFocused(false);
                          }}
                          style={{
                            width: "100%", display: "flex", alignItems: "center",
                            gap: 12, padding: "10px 16px",
                            border: "none", background: "transparent",
                            cursor: "pointer", textAlign: "left",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: 13, fontWeight: 500, color: "var(--foreground)",
                              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {result.title}
                            </p>
                            <p style={{
                              fontSize: 11, color: "var(--muted-foreground)", margin: 0, marginTop: 1,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {result.subtitle}
                            </p>
                          </div>
                          <ChevronRight style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  );
                })}

                {/* Footer hint */}
                <div style={{
                  padding: "10px 16px", borderTop: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {searchResults.length} {t("results")} · <span style={{ opacity: 0.7 }}>Esc {t("toClose")}</span>
                  </span>
                </div>
              </>
            ) : (
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <Search style={{ width: 20, height: 20, color: "var(--muted-foreground)", margin: "0 auto 8px", opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                  {t("noResults")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-1.5 mr-2">

        {/* Theme toggle — hidden on very narrow screens (< sm) */}
        <div className="hidden sm:block">
          <IconBtn onClick={toggleTheme} title={theme === "light" ? t("darkMode") : t("lightMode")}>
            {theme === "light" ? <Moon className="w-[17px] h-[17px]" /> : <Sun className="w-[17px] h-[17px]" />}
          </IconBtn>
        </div>

        {/* Language picker — hidden on very narrow screens (< sm) */}
        <div ref={langRef} className="relative hidden sm:block">
          <IconBtn onClick={() => { setIsLangOpen((v) => !v); setIsNotifOpen(false); }} title="Changer la langue" active={isLangOpen}>
            <Globe className="w-[17px] h-[17px]" />
          </IconBtn>

          {isLangOpen && (
            <div
              className="fixed top-14 rounded-2xl overflow-hidden z-50"
              style={{
                right: 16,
                width: 200,
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em" }}>
                  Langue / Language
                </p>
              </div>
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => { setLanguage(lang.code as any); setIsLangOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors"
                    style={{
                      background: isActive ? "var(--sidebar-accent)" : "transparent",
                      color: isActive ? "var(--primary)" : "var(--foreground)",
                      fontWeight: isActive ? 500 : 400,
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--background)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="flex-1 text-left">{lang.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Document scanner */}
        {user?.role === "admin" && (
          <IconBtn
            onClick={() => setIsScannerOpen(true)}
            title="Scanner un document"
          >
            <ScanLine className="w-[17px] h-[17px]" />
          </IconBtn>
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <span
            title="Mode hors-ligne — les dernières données connues sont affichées"
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.12)", color: "#B45309" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B45309" }} />
            Hors-ligne
          </span>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <IconBtn
            onClick={() => { setIsNotifOpen((v) => !v); setIsLangOpen(false); }}
            active={isNotifOpen}
            title="Notifications"
          >
            <Bell className="w-[17px] h-[17px]" />
            {unreadCount > 0 && (
              <span
                className="absolute rounded-full text-[7px] font-bold text-white flex items-center justify-center"
                style={{
                  top: 0,
                  right: -2,
                  width: 14,
                  height: 14,
                  background: "#EF4444",
                  boxShadow: "0 0 0 2px var(--card)",
                  lineHeight: 1,
                }}
              >
                {unreadCount}
              </span>
            )}
          </IconBtn>

          {isNotifOpen && (
            <div
              className="fixed rounded-2xl overflow-hidden z-50 flex flex-col"
              style={{
                top: 64,
                right: 16,
                width: 340,
                maxHeight: "calc(100vh - 80px)",
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              {/* Notif header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(239,68,68,0.10)", color: "#DC2626" }}
                    >
                      {unreadCount} nouvelles
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-medium transition-colors"
                  style={{ color: "var(--primary)" }}
                >
                  Tout lire
                </button>
              </div>

              {/* Notif list */}
              <div className="overflow-y-auto flex-1">
                {notifs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 px-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                      style={{ background: "var(--sidebar-accent)", color: "var(--muted-foreground)" }}
                    >
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-[12px] font-medium" style={{ color: "var(--foreground)" }}>
                      Aucune notification
                    </p>
                    <p className="text-[11px] mt-1 text-center" style={{ color: "var(--muted-foreground)" }}>
                      Vous serez averti ici des nouvelles activités.
                    </p>
                  </div>
                )}
                {notifs.map((n) => {
                  const isUnread = !n.read;
                  const { bg, color } = notifColor(n.category);
                  const isUrgent = n.category === "urgent";
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b"
                      style={{
                        borderColor: "var(--border)",
                        background: isUnread ? "var(--sidebar-accent)" : "transparent",
                      }}
                      onClick={() => {
                        if (isUnread) markAsRead(n.id);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? "var(--sidebar-accent)" : "transparent"; }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: bg, color }}
                      >
                        {notifIcon(n.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-[12px] leading-snug"
                            style={{
                              color: "var(--foreground)",
                              fontWeight: isUnread ? 600 : 400,
                            }}
                          >
                            {n.title}
                          </p>
                          {isUrgent && (
                            <span
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: "rgba(239,68,68,0.10)", color: "#DC2626" }}
                            >
                              Urgent
                            </span>
                          )}
                        </div>
                        {n.message && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                            {n.message}
                          </p>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                          {formatRelativeTime(n.date)}
                        </p>
                      </div>
                      {isUnread && (
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{ background: "var(--primary)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-2.5 border-t text-center shrink-0"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  type="button"
                  className="text-[12px] font-medium transition-colors"
                  style={{ color: "var(--primary)" }}
                  onClick={() => {
                    setIsNotifOpen(false);
                    onNavigate?.("notifications");
                  }}
                >
                  Voir toutes les notifications
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      <DocumentScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </header>
  );
}

/* ─── Reusable icon button ───────────────────────────────────── */

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="relative flex items-center gap-1.5 h-9 px-2.5 rounded-xl transition-colors"
      style={{
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        background: active ? "var(--background)" : "transparent",
        border: "none",
        outline: "none",
        boxShadow: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--background)";
          e.currentTarget.style.color = "var(--foreground)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--muted-foreground)";
        }
      }}
    >
      {children}
    </button>
  );
}
