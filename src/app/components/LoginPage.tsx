import React, { useState } from "react";
import { Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";
import { ImmoStoreLogo } from "./ImmoStoreLogo";

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 48,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #E0E0E0",
    background: "#F8F8F8",
    color: "#1A1A1A",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── Left panel: dark image ── */}
      <div
        style={{
          width: "45%",
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          display: "none",
        }}
        className="login-left-panel"
      >
        <img
          src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80"
          alt="Building"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, rgba(20,24,22,0.85) 0%, rgba(20,24,22,0.6) 100%)",
          }}
        />

        {/* Branding on image */}
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 36,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ImmoStoreLogo size={40} />
          <div>
            <div style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
              {t("appName")}
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              {t("loginSubtitle")}
            </div>
          </div>
        </div>

        {/* Demo accounts overlay — bottom of image */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 36,
            right: 36,
            padding: "18px 20px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "0 0 8px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("demoAccounts")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: 0 }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{t("admin")}:</span>{" "}
              admin@immostore.com / admin123
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: 0 }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{t("tenant")}:</span>{" "}
              dylan@locataire.com / tenant123
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 24px",
          background: "#FFFFFF",
          position: "relative",
          minHeight: "100vh",
        }}
      >
        {/* Language switcher — top right */}
        <div style={{ position: "absolute", top: 24, right: 28 }}>
          <div style={{ position: "relative" }}>
            <Globe
              style={{
                width: 15,
                height: 15,
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#999",
                pointerEvents: "none",
              }}
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              style={{
                appearance: "none",
                paddingLeft: 32,
                paddingRight: 14,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 8,
                border: "1px solid #E0E0E0",
                background: "#FAFAFA",
                color: "#333",
                fontSize: 12,
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

        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* App name + subtitle */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <ImmoStoreLogo size={36} />
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>
                  {t("appName")}
                </span>
                <span style={{ fontSize: 11, color: "#999", display: "block", marginTop: -1 }}>
                  {t("loginSubtitle")}
                </span>
              </div>
            </div>
          </div>

          {/* Welcome heading */}
          <h1
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: "#1A1A1A",
              margin: "32px 0 48px",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {t("loginWelcome") !== "loginWelcome"
              ? t("loginWelcome")
              : `Welcome, login to\nyour account.`}
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#555",
                  marginBottom: 8,
                }}
              >
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#1C201E";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(28,32,30,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E0E0E0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 32 }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#555",
                  marginBottom: 8,
                }}
              >
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#1C201E";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(28,32,30,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E0E0E0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                {error}
              </div>
            )}

            {/* Button row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                type="submit"
                style={{
                  height: 46,
                  padding: "0 28px",
                  borderRadius: 23,
                  border: "none",
                  background: "#1C201E",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#2A2F2C"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1C201E"; }}
              >
                {t("loginButton")}
              </button>

              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#555"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}
              >
                {t("forgotPassword") !== "forgotPassword"
                  ? t("forgotPassword")
                  : "Lost your password?"}
              </button>
            </div>
          </form>

          {/* Demo accounts — mobile only (shown below form when left panel is hidden) */}
          <div
            className="login-demo-mobile"
            style={{
              marginTop: 40,
              padding: 16,
              borderRadius: 12,
              background: "#F8F8F8",
              border: "1px solid #ECECEC",
              display: "none",
            }}
          >
            <p style={{ fontSize: 11, color: "#999", margin: "0 0 8px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("demoAccounts")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 12, color: "#333", margin: 0 }}>
                <span style={{ color: "#999" }}>{t("admin")}:</span>{" "}
                admin@immostore.com / admin123
              </p>
              <p style={{ fontSize: 12, color: "#333", margin: 0 }}>
                <span style={{ color: "#999" }}>{t("tenant")}:</span>{" "}
                dylan@locataire.com / tenant123
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 11,
            color: "#BBB",
            margin: 0,
          }}
        >
          {t("allRightsReserved")}
        </p>
      </div>

      {/* CSS for responsive left panel */}
      <style>{`
        @media (min-width: 900px) {
          .login-left-panel {
            display: block !important;
          }
        }
        @media (max-width: 899px) {
          .login-demo-mobile {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
