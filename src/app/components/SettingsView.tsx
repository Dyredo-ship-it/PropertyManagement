import React, { useState, useEffect } from "react";
import {
  User,
  Lock,
  Bell,
  Globe,
  Palette,
  Shield,
  CreditCard,
  Mail,
  Building,
  Save,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

/* ─── Types ────────────────────────────────────────────────────── */

type TabId = "profile" | "security" | "notifications" | "appearance" | "billing" | "company";

type Tab = {
  id: TabId;
  labelKey: string;
  icon: React.ElementType;
};

/* ─── Section wrapper ──────────────────────────────────────────── */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--card)",
        padding: "28px 28px 24px",
        marginBottom: 20,
      }}
    >
      <h3
        className="text-[15px] font-semibold"
        style={{ color: "var(--foreground)", marginBottom: description ? 4 : 20 }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-[12px] mb-5" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

/* ─── Form field ───────────────────────────────────────────────── */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        className="text-[12px] font-medium block"
        style={{ color: "var(--muted-foreground)", marginBottom: 6 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

/* ─── Toggle switch ────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: checked ? "var(--primary)" : "var(--muted)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

/* ─── Toggle Row ───────────────────────────────────────────────── */

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{
        padding: "14px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
          {label}
        </p>
        {description && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {description}
          </p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ─── SaveButton ───────────────────────────────────────────────── */

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "0 20px",
        borderRadius: 10,
        border: "none",
        background: saved ? "#16A34A" : "var(--primary)",
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s",
      }}
    >
      {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saved ? "Saved" : "Save changes"}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB CONTENT PANELS
═══════════════════════════════════════════════════════════════ */

function ProfileTab({ user }: { user: any }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("+41 79 000 00 00");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Section title="Personal Information" description="Update your personal details.">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {(user?.name ?? "A").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "var(--foreground)" }}>
              {user?.name}
            </p>
            <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
              {user?.role === "admin" ? "Administrator" : "Tenant"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
          <Field label="Full Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Email Address">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Phone Number">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Role">
            <input
              type="text"
              value={user?.role === "admin" ? "Administrator" : "Tenant"}
              disabled
              style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
            />
          </Field>
        </div>
      </Section>

      <SaveButton saved={saved} onClick={handleSave} />
    </>
  );
}

function SecurityTab() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFa, setTwoFa] = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pwFieldStyle: React.CSSProperties = { ...inputStyle, paddingRight: 42 };

  return (
    <>
      <Section title="Change Password" description="Update your password to keep your account secure.">
        <div style={{ maxWidth: 400 }}>
          <Field label="Current Password">
            <div style={{ position: "relative" }}>
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                style={pwFieldStyle}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--muted-foreground)",
                }}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="New Password">
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••"
                style={pwFieldStyle}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--muted-foreground)",
                }}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </Field>
        </div>
      </Section>

      <Section title="Security Options">
        <ToggleRow
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          checked={twoFa}
          onChange={setTwoFa}
        />
        <ToggleRow
          label="Session Login Alerts"
          description="Get notified when a new device logs in"
          checked={sessionAlerts}
          onChange={setSessionAlerts}
        />
      </Section>

      <SaveButton saved={saved} onClick={handleSave} />
    </>
  );
}

function NotificationsTab() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [requestUpdates, setRequestUpdates] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Section title="Notification Channels" description="Choose how you want to receive notifications.">
        <ToggleRow
          label="Email Notifications"
          description="Receive notifications via email"
          checked={emailNotifs}
          onChange={setEmailNotifs}
        />
        <ToggleRow
          label="Push Notifications"
          description="Receive browser push notifications"
          checked={pushNotifs}
          onChange={setPushNotifs}
        />
      </Section>

      <Section title="Notification Types" description="Select which events trigger notifications.">
        <ToggleRow
          label="Maintenance Request Updates"
          description="When a request changes status or receives a comment"
          checked={requestUpdates}
          onChange={setRequestUpdates}
        />
        <ToggleRow
          label="Payment Reminders"
          description="Upcoming and overdue rent payment alerts"
          checked={paymentReminders}
          onChange={setPaymentReminders}
        />
        <ToggleRow
          label="Maintenance Alerts"
          description="Urgent maintenance and inspection notices"
          checked={maintenanceAlerts}
          onChange={setMaintenanceAlerts}
        />
        <ToggleRow
          label="Weekly Summary Report"
          description="Receive a weekly portfolio performance email"
          checked={weeklyReport}
          onChange={setWeeklyReport}
        />
      </Section>

      <SaveButton saved={saved} onClick={handleSave} />
    </>
  );
}

function AppearanceTab() {
  const { language, setLanguage } = useLanguage();
  const [dateFormat, setDateFormat] = useState("dd.MM.yyyy");
  const [currency, setCurrency] = useState("CHF");
  const [compactMode, setCompactMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Check current theme
  const isDark = document.documentElement.classList.contains("dark");
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <>
      <Section title="Theme" description="Customize the appearance of the application.">
        <div className="flex gap-3">
          {[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
          ].map((theme) => {
            const active =
              (theme.id === "dark" && isDark) ||
              (theme.id === "light" && !isDark);
            return (
              <button
                key={theme.id}
                type="button"
                onClick={toggleTheme}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: active
                    ? "2px solid var(--primary)"
                    : "1px solid var(--border)",
                  background: active ? "var(--sidebar-accent)" : "var(--background)",
                  color: "var(--foreground)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {theme.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Language & Region" description="Set your preferred language and formatting.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5">
          <Field label="Language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date Format">
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="dd.MM.yyyy">dd.MM.yyyy</option>
              <option value="MM/dd/yyyy">MM/dd/yyyy</option>
              <option value="yyyy-MM-dd">yyyy-MM-dd</option>
            </select>
          </Field>
          <Field label="Currency">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="CHF">CHF — Swiss Franc</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Display">
        <ToggleRow
          label="Compact Mode"
          description="Reduce spacing and padding for denser views"
          checked={compactMode}
          onChange={setCompactMode}
        />
      </Section>

      <SaveButton saved={saved} onClick={handleSave} />
    </>
  );
}

function BillingTab() {
  return (
    <>
      <Section title="Current Plan" description="Your active subscription plan.">
        <div
          className="flex items-center justify-between"
          style={{
            padding: "20px 24px",
            borderRadius: 14,
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <p className="text-[16px] font-bold" style={{ color: "var(--foreground)" }}>
              Pro Plan
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Unlimited buildings, tenants, and analytics
            </p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold" style={{ color: "var(--foreground)" }}>
              CHF 49
            </p>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              / month
            </p>
          </div>
        </div>
      </Section>

      <Section title="Payment Method" description="Manage your payment details.">
        <div
          className="flex items-center gap-4"
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="w-10 h-7 rounded flex items-center justify-center"
            style={{ background: "#1A1F36" }}
          >
            <span className="text-[10px] font-bold text-white">VISA</span>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
              •••• •••• •••• 4242
            </p>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Expires 12/2027
            </p>
          </div>
          <button
            type="button"
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Update
          </button>
        </div>
      </Section>

      <Section title="Billing History">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Description", "Amount", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-medium uppercase"
                    style={{
                      color: "var(--muted-foreground)",
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--border)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { date: "01.03.2026", desc: "Pro Plan — Monthly", amount: "CHF 49.00", status: "Paid" },
                { date: "01.02.2026", desc: "Pro Plan — Monthly", amount: "CHF 49.00", status: "Paid" },
                { date: "01.01.2026", desc: "Pro Plan — Monthly", amount: "CHF 49.00", status: "Paid" },
              ].map((row) => (
                <tr key={row.date}>
                  {[row.date, row.desc, row.amount].map((cell, i) => (
                    <td
                      key={i}
                      className="text-[13px]"
                      style={{
                        color: "var(--foreground)",
                        padding: "12px 12px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: "12px 12px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(34,197,94,0.1)",
                        color: "#16A34A",
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function CompanyTab() {
  const [companyName, setCompanyName] = useState("ImmoStore SA");
  const [address, setAddress] = useState("Rue du Marché 12, 1204 Genève");
  const [vatId, setVatId] = useState("CHE-123.456.789");
  const [contactEmail, setContactEmail] = useState("contact@immostore.ch");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Section title="Company Information" description="Your organization details.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
          <Field label="Company Name">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Contact Email">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Address">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="VAT / Tax ID">
            <input
              type="text"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>
      </Section>

      <SaveButton saved={saved} onClick={handleSave} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN SETTINGS VIEW
═══════════════════════════════════════════════════════════════ */

export function SettingsView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const tabs: Tab[] = [
    { id: "profile", labelKey: "Profile", icon: User },
    { id: "security", labelKey: "Security", icon: Lock },
    { id: "notifications", labelKey: "Notifications", icon: Bell },
    { id: "appearance", labelKey: "Appearance", icon: Palette },
    { id: "billing", labelKey: "Billing", icon: CreditCard },
    { id: "company", labelKey: "Company", icon: Building },
  ];

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          className="text-[22px] font-semibold leading-tight"
          style={{ color: "var(--foreground)" }}
        >
          {t("navSettings")}
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          Manage your account, preferences, and application settings.
        </p>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row">
        {/* Tab nav — vertical on desktop */}
        <div
          className="shrink-0 lg:w-[200px]"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 4,
            overflowX: "auto",
          }}
        >
          <div className="flex lg:flex-col gap-1 w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2.5 transition-all whitespace-nowrap"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: active ? "var(--sidebar-accent)" : "transparent",
                    color: active ? "var(--primary)" : "var(--muted-foreground)",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.labelKey}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && <ProfileTab user={user} />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "billing" && <BillingTab />}
          {activeTab === "company" && <CompanyTab />}
        </div>
      </div>
    </div>
  );
}
