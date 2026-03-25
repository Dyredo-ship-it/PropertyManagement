import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

/* ─── Mock notifications ─────────────────────────────────────── */

type Notif = {
  id: number;
  type: "request" | "application" | "message" | "alert";
  title: string;
  body: string;
  time: string;
  unread: boolean;
  priority?: boolean;
};

const ADMIN_NOTIFS: Notif[] = [
  { id: 1, type: "request", title: "Nouvelle demande de maintenance", body: "Alice Fontaine · Résidence Bellevue · Apt 3B", time: "Il y a 5 min", unread: true, priority: true },
  { id: 2, type: "application", title: "Candidature reçue", body: "Pierre Morel · Résidence Pins · Apt 7A", time: "Il y a 1h", unread: true, priority: false },
  { id: 3, type: "request", title: "Demande mise à jour", body: "Famille Keller · Résidence Lumière · Apt 2C", time: "Il y a 3h", unread: false, priority: false },
  { id: 4, type: "message", title: "Message locataire", body: "Jean-Marc Duval a envoyé un message", time: "Hier", unread: false, priority: false },
];

const TENANT_NOTIFS: Notif[] = [
  { id: 1, type: "alert", title: "Votre demande a été traitée", body: "Fuite robinet · Résidence Bellevue", time: "Il y a 2h", unread: true, priority: false },
  { id: 2, type: "message", title: "Message de la gérance", body: "Concernant votre renouvellement de bail", time: "Hier", unread: true, priority: true },
  { id: 3, type: "request", title: "Intervention planifiée", body: "Technicien prévu le 28 mars 2026", time: "Il y a 2j", unread: false, priority: false },
];

const notifIcon = (type: Notif["type"]) => {
  const cls = "w-4 h-4";
  if (type === "request") return <Wrench className={cls} />;
  if (type === "application") return <FileText className={cls} />;
  if (type === "message") return <MessageSquare className={cls} />;
  return <AlertCircle className={cls} />;
};

const notifColor = (type: Notif["type"]) => {
  if (type === "request") return { bg: "rgba(245,158,11,0.10)", color: "#B45309" };
  if (type === "application") return { bg: "rgba(59,130,246,0.10)", color: "#1D4ED8" };
  if (type === "message") return { bg: "rgba(139,92,246,0.10)", color: "#6D28D9" };
  return { bg: "rgba(239,68,68,0.10)", color: "#DC2626" };
};

/* ─── Component ──────────────────────────────────────────────── */

export function TopHeader() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState<Set<number>>(new Set());

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const notifs = user?.role === "admin" ? ADMIN_NOTIFS : TENANT_NOTIFS;
  const unreadCount = notifs.filter((n) => n.unread && !notifRead.has(n.id)).length;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setIsLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    setNotifRead(new Set(notifs.map((n) => n.id)));
  };

  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <header
      className="shrink-0 flex items-center gap-4"
      style={{
        height: 64,
        padding: "0 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-[440px]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="w-full text-[13px] outline-none transition-all"
            style={{
              padding: "8px 14px 8px 36px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(69,85,58,0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-1">

        {/* Theme toggle */}
        <IconBtn onClick={toggleTheme} title={theme === "light" ? t("darkMode") : t("lightMode")}>
          {theme === "light" ? <Moon className="w-[17px] h-[17px]" /> : <Sun className="w-[17px] h-[17px]" />}
        </IconBtn>

        {/* Language picker */}
        <div ref={langRef} className="relative">
          <IconBtn onClick={() => { setIsLangOpen((v) => !v); setIsNotifOpen(false); }} title="Changer la langue" active={isLangOpen}>
            <Globe className="w-[17px] h-[17px]" />
            {currentLang && (
              <span className="text-[11px] font-semibold ml-0.5">{currentLang.code.toUpperCase()}</span>
            )}
          </IconBtn>

          {isLangOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
              style={{
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
                    <span className="text-base w-5 text-center">{lang.flag}</span>
                    <span className="flex-1 text-left">{lang.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
                className="absolute rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{
                  top: 2,
                  right: 0,
                  width: 16,
                  height: 16,
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
                {notifs.map((n) => {
                  const isUnread = n.unread && !notifRead.has(n.id);
                  const { bg, color } = notifColor(n.type);
                  return (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b"
                      style={{
                        borderColor: "var(--border)",
                        background: isUnread ? "var(--sidebar-accent)" : "transparent",
                      }}
                      onClick={() => setNotifRead((prev) => new Set([...prev, n.id]))}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? "var(--sidebar-accent)" : "transparent"; }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: bg, color }}
                      >
                        {notifIcon(n.type)}
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
                          {n.priority && (
                            <span
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: "rgba(239,68,68,0.10)", color: "#DC2626" }}
                            >
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                          {n.body}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                          {n.time}
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
                >
                  Voir toutes les notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "var(--border)", margin: "0 8px" }} />

        {/* User name */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
              {user?.name}
            </p>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {user?.role === "admin" ? t("admin") : t("tenant")}
            </p>
          </div>
        </div>
      </div>
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
      className="relative flex items-center gap-1 h-9 px-2.5 rounded-xl transition-colors"
      style={{
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        background: active ? "var(--background)" : "transparent",
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
