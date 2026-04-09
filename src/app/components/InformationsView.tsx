import React from "react";
import { Info, FileText, Phone, Shield, Heart, BookOpen, AlertTriangle, TrendingDown, Wrench } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

export function InformationsView() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (user?.role === "admin") {
    return (
      <div style={{ padding: "32px 36px 48px" }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 650, margin: 0, lineHeight: 1.2,
            color: "var(--foreground)",
            borderLeft: "4px solid var(--primary)",
            paddingLeft: 14,
          }}>
            {t("informationsTitle")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 4, paddingLeft: 18 }}>
            {t("informationsSub")}
          </p>
        </div>

        {/* ── Info cards grid ────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          <InfoCard
            icon={TrendingDown}
            title={t("referenceRate")}
            text={t("referenceRateText")}
            accent="var(--primary)"
          />
          <InfoCard
            icon={AlertTriangle}
            title={t("cpiIndexation")}
            text={t("cpiIndexationText")}
            accent="#B45309"
          />
          <InfoCard
            icon={Wrench}
            title={t("maintenanceReserves")}
            text={t("maintenanceReservesText")}
            accent="#2563EB"
          />
        </div>
      </div>
    );
  }

  /* ── Tenant view ──────────────────────────────────────────── */
  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 650, margin: 0, lineHeight: 1.2,
          color: "var(--foreground)",
          borderLeft: "4px solid var(--primary)",
          paddingLeft: 14,
        }}>
          {t("infoTenantTitle")}
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 4, paddingLeft: 18 }}>
          {t("infoTenantSub")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* ── Regulations ────────────────────────────────────── */}
        <div style={{
          borderRadius: 14, border: "1px solid var(--border)",
          background: "var(--card)", overflow: "hidden",
        }}>
          {/* Card header */}
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "rgba(69,85,58,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderLeft: "3px solid var(--primary)",
            }}>
              <BookOpen style={{ width: 14, height: 14, color: "var(--primary)" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 650, color: "var(--foreground)" }}>
              {t("regulations")}
            </span>
          </div>
          {/* Links */}
          <div style={{ padding: "8px 10px" }}>
            {[
              t("buildingRules"),
              t("laundryRules"),
              t("wasteRules"),
            ].map((label) => (
              <a
                key={label}
                href="#"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 8,
                  color: "var(--foreground)", textDecoration: "none",
                  fontSize: 12, transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <FileText style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Contacts ───────────────────────────────────────── */}
        <div style={{
          borderRadius: 14, border: "1px solid var(--border)",
          background: "var(--card)", overflow: "hidden",
        }}>
          {/* Card header */}
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "rgba(69,85,58,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderLeft: "3px solid var(--primary)",
            }}>
              <Phone style={{ width: 14, height: 14, color: "var(--primary)" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 650, color: "var(--foreground)" }}>
              {t("usefulContacts")}
            </span>
          </div>
          {/* Contact list */}
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <ContactItem icon={Phone} label={t("managementEmergency")} value="032 722 45 67" />
            <ContactItem icon={Shield} label={t("concierge")} value="M. Dupont - 079 456 78 12" sub="Présent lu-ve 8h-12h" />
            <ContactItem icon={Heart} label={t("medicalEmergency")} value="144" accent="#DC2626" />
            <ContactItem icon={Shield} label={t("police")} value="117" accent="#2563EB" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Info Card ────────────────────────────────────────── */

function InfoCard({
  icon: Icon,
  title,
  text,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      border: "1px solid var(--border)",
      background: "var(--card)",
      borderLeft: `3px solid ${accent}`,
    }}>
      {/* Top zone */}
      <div style={{
        padding: "16px 18px 12px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: `${accent}10`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 14, height: 14, color: accent }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 650, color: "var(--foreground)" }}>
          {title}
        </span>
      </div>
      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", marginLeft: 18, marginRight: 18 }} />
      {/* Body */}
      <div style={{ padding: "12px 18px 16px" }}>
        <p style={{
          fontSize: 12, lineHeight: 1.6, margin: 0,
          color: "var(--muted-foreground)",
        }}>
          {text}
        </p>
      </div>
    </div>
  );
}

/* ─── Tenant Contact Item ────────────────────────────────────── */

function ContactItem({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: 8,
      background: "var(--background)",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: accent ? `${accent}10` : "rgba(69,85,58,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon style={{ width: 13, height: 13, color: accent || "var(--primary)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block" }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
          {value}
          {sub && <span style={{ opacity: 0.7 }}> · {sub}</span>}
        </span>
      </div>
    </div>
  );
}
