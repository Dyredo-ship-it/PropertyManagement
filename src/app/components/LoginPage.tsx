import React, { useState } from "react";
import { Building2, Lock, Mail, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError(t("loginFieldsRequired"));
      return;
    }

    const success = login(email, password);
    if (!success) {
      setError(t("loginError"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF5F2]">
      {/* Language switcher - top right */}
      <div className="absolute top-4 right-4">
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="appearance-none pl-8 pr-4 py-2 rounded-xl border border-[#E8E5DB] bg-white text-[#171414] text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#45553A]/20"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
          <Globe className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B6560] pointer-events-none" />
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#45553A] mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-semibold text-[#171414] mb-2">{t("appName")}</h1>
          <p className="text-[#6B6560]">{t("loginSubtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E8E5DB]">
          <h2 className="text-2xl font-semibold text-center text-[#171414] mb-6">{t("loginTitle")}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[#171414]">{t("email")}</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6560]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] focus:border-[#45553A] focus:ring-[#45553A]/20"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-[#171414]">{t("password")}</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6560]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] focus:border-[#45553A] focus:ring-[#45553A]/20"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-[#45553A] hover:bg-[#3a4930] text-white font-medium py-2.5">
              {t("loginButton")}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-[#FAF5F2] rounded-xl border border-[#E8E5DB]">
            <p className="text-xs text-[#6B6560] mb-2">{t("demoAccounts")}</p>
            <div className="space-y-1 text-xs">
              <p className="text-[#171414]">
                <span className="text-[#6B6560]">{t("admin")}:</span> admin@immostore.com / admin123
              </p>
              <p className="text-[#171414]">
                <span className="text-[#6B6560]">{t("tenant")}:</span> dylan@locataire.com / tenant123
              </p>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-[#6B6560]">
          {t("allRightsReserved")}
        </p>
      </div>
    </div>
  );
}
