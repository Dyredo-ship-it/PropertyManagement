import React from "react";
import { Search, Bell, User, Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

export function TopHeader() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="border-b border-border bg-card">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="appearance-none pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-muted/50 transition-colors"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
              <Globe className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl transition-all hover:bg-muted/50 text-muted-foreground hover:text-foreground">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-card"></span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-2 ml-1 border-l border-border">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground leading-tight">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.role === "admin" ? t("admin") : t("tenant")}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary text-primary-foreground shadow-sm">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
