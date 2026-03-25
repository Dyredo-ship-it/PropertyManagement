import React from "react";
import { Info, FileText, Phone, Shield, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

export function InformationsView() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (user?.role === "admin") {
    return (
      <div style={{ padding: "32px 32px 48px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            className="text-[22px] font-semibold leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {t("informationsTitle")}
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t("informationsSub")}
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "24px",
          }}
        >
          <div className="flex gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(69,85,58,0.07)",
                color: "var(--primary)",
              }}
            >
              <Info className="w-5 h-5" />
            </div>

            <div className="space-y-5 text-[13px] leading-relaxed">
              <InfoBlock
                title={t("referenceRate")}
                text={t("referenceRateText")}
              />
              <InfoBlock
                title={t("cpiIndexation")}
                text={t("cpiIndexationText")}
              />
              <InfoBlock
                title={t("maintenanceReserves")}
                text={t("maintenanceReservesText")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Tenant view ──────────────────────────────────────────── */
  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          className="text-[22px] font-semibold leading-tight"
          style={{ color: "var(--foreground)" }}
        >
          {t("infoTenantTitle")}
        </h1>
        <p
          className="text-[13px] mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          {t("infoTenantSub")}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Regulations */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "24px",
          }}
        >
          <h2
            className="text-[15px] font-semibold mb-5"
            style={{ color: "var(--foreground)" }}
          >
            {t("regulations")}
          </h2>
          <div className="space-y-2">
            {[
              t("buildingRules"),
              t("laundryRules"),
              t("wasteRules"),
            ].map((label) => (
              <a
                key={label}
                href="#"
                className="flex items-center gap-3 transition-colors"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  color: "var(--foreground)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--background)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <FileText
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <span className="text-[13px]">{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Contacts */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--card)",
            padding: "24px",
          }}
        >
          <h2
            className="text-[15px] font-semibold mb-5"
            style={{ color: "var(--foreground)" }}
          >
            {t("usefulContacts")}
          </h2>
          <div className="space-y-4">
            <ContactItem
              icon={Phone}
              label={t("managementEmergency")}
              value="022 123 45 67"
            />
            <ContactItem
              icon={Shield}
              label={t("concierge")}
              value="M. Dupont - 079 123 45 67"
              sub="Présent lu-ve 8h-12h"
            />
            <ContactItem
              icon={Heart}
              label={t("medicalEmergency")}
              value="144"
            />
            <ContactItem
              icon={Shield}
              label={t("police")}
              value="117"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p
        className="font-semibold text-[13px] mb-1"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </p>
      <p style={{ color: "var(--muted-foreground)" }}>{text}</p>
    </div>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--background)" }}
      >
        <Icon className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
      </div>
      <div>
        <p
          className="text-[13px] font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {label}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
