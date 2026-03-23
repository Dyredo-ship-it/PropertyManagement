import React from "react";
import { Search, Bell, Sun, Moon, Globe, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

export function TopHeader() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 16,
        shrink: 0,
      }}
    >
      {/* Left: Page context */}
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-[15px] font-semibold leading-tight truncate" style={{ color: "var(--foreground)" }}>
          {t("dashboardTitle")}
        </h1>
        <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
          {t("dashboardSubtitle")}
        </p>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="w-full text-sm outline-none transition-all"
            style={{
              padding: "9px 16px 9px 38px",
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

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Theme */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "light" ? t("darkMode") : t("lightMode")}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--background)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          {theme === "light" ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
        </button>

        {/* Language */}
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as keyof typeof LANGUAGES extends never ? string : any)}
            className="appearance-none text-xs font-medium cursor-pointer outline-none transition-colors"
            style={{
              padding: "7px 10px 7px 28px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
          <Globe
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "var(--muted-foreground)" }}
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--background)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          <Bell className="w-[18px] h-[18px]" />
          <span
            className="absolute rounded-full"
            style={{
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              background: "#EF4444",
              boxShadow: "0 0 0 2px var(--card)",
            }}
          />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "var(--border)", margin: "0 6px" }} />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-medium leading-tight" style={{ color: "var(--foreground)" }}>
              {user?.name}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {user?.role === "admin" ? t("admin") : t("tenant")}
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow: "0 1px 3px rgba(69,85,58,0.2)",
            }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
