import React, { useState } from "react";
import { Building2, Lock, Mail, Globe } from "lucide-react";
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--background)",
        position: "relative",
      }}
    >
      {/* Language switcher — top right */}
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <div style={{ position: "relative" }}>
          <Globe
            className="w-4 h-4"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted-foreground)",
              pointerEvents: "none",
            }}
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            style={{
              appearance: "none",
              paddingLeft: 36,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo + branding */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "var(--primary)",
              marginBottom: 16,
              boxShadow: "0 8px 24px rgba(69, 85, 58, 0.25)",
            }}
          >
            <Building2 className="w-8 h-8" style={{ color: "#FFFFFF" }} />
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--foreground)",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            {t("appName")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>
            {t("loginSubtitle")}
          </p>
        </div>

        {/* Login card */}
        <div
          style={{
            background: "var(--card)",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              textAlign: "center",
              color: "var(--foreground)",
              margin: "0 0 28px",
            }}
          >
            {t("loginTitle")}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: 8,
                }}
              >
                {t("email")}
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  className="w-[18px] h-[18px]"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted-foreground)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{
                    width: "100%",
                    height: 46,
                    paddingLeft: 44,
                    paddingRight: 16,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: 8,
                }}
              >
                {t("password")}
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  className="w-[18px] h-[18px]"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted-foreground)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    height: 46,
                    paddingLeft: 44,
                    paddingRight: 16,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "none",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {t("loginButton")}
            </button>
          </form>

          {/* Demo accounts */}
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: "var(--background)",
              borderRadius: 14,
              border: "1px solid var(--border)",
            }}
          >
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 8px" }}>
              {t("demoAccounts")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 12, color: "var(--foreground)", margin: 0 }}>
                <span style={{ color: "var(--muted-foreground)" }}>{t("admin")}:</span>{" "}
                <strong>admin@immostore.com</strong> / admin123
              </p>
              <p style={{ fontSize: 12, color: "var(--foreground)", margin: 0 }}>
                <span style={{ color: "var(--muted-foreground)" }}>{t("tenant")}:</span>{" "}
                <strong>dylan@locataire.com</strong> / tenant123
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 12,
            color: "var(--muted-foreground)",
          }}
        >
          {t("allRightsReserved")}
        </p>
      </div>
    </div>
  );
}
