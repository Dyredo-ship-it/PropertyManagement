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
  Users as UsersIcon,
} from "lucide-react";
import { TeamTab } from "./TeamTab";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";
import { getLandlordInfo, saveLandlordInfo } from "../lib/landlord";
import { getOrgRentSettings, saveOrgRentSettings } from "../utils/storage";
import {
  pushIsSupported,
  pushPermission,
  currentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/push";
import {
  biometricSupported,
  biometricAvailable,
  biometricEnabled,
  enableBiometric,
  disableBiometric,
} from "../lib/biometric";
import {
  PLANS,
  fetchSubscription,
  startCheckout,
  openBillingPortal,
  type Plan,
  type SubscriptionInfo,
} from "../lib/billing";

/* ─── Types ────────────────────────────────────────────────────── */

type TabId = "profile" | "security" | "notifications" | "appearance" | "billing" | "company" | "team";

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
  const [phone, setPhone] = useState("079 612 34 56");
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
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFa, setTwoFa] = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  // Biometric app lock
  const [bioSupported] = useState(biometricSupported());
  const [bioAvail, setBioAvail] = useState(false);
  const [bioOn, setBioOn] = useState(user ? biometricEnabled(user.id) : false);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    biometricAvailable().then(setBioAvail).catch(() => setBioAvail(false));
  }, []);

  const handleToggleBio = async () => {
    if (!user) return;
    setBioBusy(true);
    setBioError(null);
    try {
      if (bioOn) {
        disableBiometric();
        setBioOn(false);
      } else {
        await enableBiometric({
          userId: user.id,
          userName: user.email,
          displayName: user.name || user.email,
        });
        setBioOn(true);
      }
    } catch (err) {
      setBioError((err as Error).message);
    } finally {
      setBioBusy(false);
    }
  };

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
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 0", borderBottom: "1px solid var(--border)", gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 550, color: "var(--foreground)" }}>
              Verrouillage biométrique (cet appareil)
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              Exigez Face ID / Touch ID à chaque ouverture de Palier sur cet appareil.
            </div>
            <div
              style={{
                fontSize: 11, marginTop: 6,
                color: bioOn ? "#16a34a" : "var(--muted-foreground)",
              }}
            >
              {!bioSupported
                ? "Non supporté par ce navigateur"
                : !bioAvail
                ? "Aucun lecteur biométrique détecté sur cet appareil"
                : bioOn
                ? "Activé"
                : "Désactivé"}
            </div>
            {bioError && (
              <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>
                {bioError}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleBio}
            disabled={!bioSupported || !bioAvail || bioBusy}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)",
              background: bioOn ? "var(--background)" : "var(--primary)",
              color: bioOn ? "var(--foreground)" : "var(--primary-foreground)",
              fontSize: 12, fontWeight: 600,
              cursor: (!bioSupported || !bioAvail || bioBusy) ? "not-allowed" : "pointer",
              opacity: (!bioSupported || !bioAvail || bioBusy) ? 0.6 : 1,
              minWidth: 100,
            }}
          >
            {bioBusy ? "..." : bioOn ? "Désactiver" : "Activer"}
          </button>
        </div>
      </Section>

      <SaveButton saved={saved} onClick={handleSave} />
    </>
  );
}

function NotificationsTab() {
  const { user } = useAuth();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [requestUpdates, setRequestUpdates] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [saved, setSaved] = useState(false);

  // Live push state — reflects browser permission + actual subscription
  const [pushSupported] = useState(pushIsSupported());
  const [pushPerm, setPushPerm] = useState<NotificationPermission>(pushPermission());
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported) return;
    currentPushSubscription()
      .then((s) => setPushSubscribed(!!s))
      .catch(() => setPushSubscribed(false));
  }, [pushSupported]);

  const handleTogglePush = async () => {
    if (!user?.organizationId) {
      setPushError("Organisation introuvable.");
      return;
    }
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        setPushSubscribed(false);
      } else {
        await subscribeToPush(user.organizationId, user.id);
        setPushSubscribed(true);
      }
      setPushPerm(pushPermission());
    } catch (err) {
      setPushError((err as Error).message);
    } finally {
      setPushBusy(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pushStatusLabel = !pushSupported
    ? "Non supporté par ce navigateur"
    : pushPerm === "denied"
    ? "Refusé — autorisez les notifications dans les réglages du navigateur"
    : pushSubscribed
    ? "Activé sur cet appareil"
    : "Désactivé";

  return (
    <>
      <Section title="Notification Channels" description="Choose how you want to receive notifications.">
        <ToggleRow
          label="Email Notifications"
          description="Receive notifications via email"
          checked={emailNotifs}
          onChange={setEmailNotifs}
        />
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 0", borderBottom: "1px solid var(--border)", gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 550, color: "var(--foreground)" }}>
              Notifications push (cet appareil)
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              Recevez des alertes même quand l'app est fermée.
            </div>
            <div
              style={{
                fontSize: 11, marginTop: 6,
                color: pushSubscribed ? "#16a34a" : "var(--muted-foreground)",
              }}
            >
              {pushStatusLabel}
            </div>
            {pushError && (
              <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>
                {pushError}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={!pushSupported || pushPerm === "denied" || pushBusy}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)",
              background: pushSubscribed ? "var(--background)" : "var(--primary)",
              color: pushSubscribed ? "var(--foreground)" : "var(--primary-foreground)",
              fontSize: 12, fontWeight: 600,
              cursor: (!pushSupported || pushPerm === "denied" || pushBusy) ? "not-allowed" : "pointer",
              opacity: (!pushSupported || pushPerm === "denied" || pushBusy) ? 0.6 : 1,
              minWidth: 100,
            }}
          >
            {pushBusy ? "..." : pushSubscribed ? "Désactiver" : "Activer"}
          </button>
        </div>
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
  const { baseCurrency, setBaseCurrency: setCurrency } = useCurrency();
  const currency = baseCurrency;
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
              <option value="GBP">GBP — British Pound</option>
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
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription()
      .then((s) => setSub(s))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    setError(null);
    setBusy(plan);
    try {
      await startCheckout(plan);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors du paiement");
      setBusy(null);
    }
  };

  const handlePortal = async () => {
    setError(null);
    setBusy("portal");
    try {
      await openBillingPortal();
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de l'ouverture du portail");
      setBusy(null);
    }
  };

  const currentPlan = sub?.plan ?? null;
  const status = sub?.status ?? "trialing";
  const isActive = status === "active" || status === "trialing";
  const needsCardUpdate = status === "past_due" || status === "unpaid";

  return (
    <>
      <Section title="Plan actuel" description="Votre abonnement actuel.">
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted-foreground)" }}>Chargement…</div>
        ) : (
          <div
            style={{
              padding: "20px 24px",
              borderRadius: 14,
              background: "var(--background)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <p className="text-[16px] font-bold" style={{ color: "var(--foreground)" }}>
                {currentPlan
                  ? PLANS.find((p) => p.id === currentPlan)?.name ?? currentPlan
                  : "Aucun abonnement actif"}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Statut : {status}
                {sub?.current_period_end && !sub?.cancel_at_period_end
                  ? ` · prochain renouvellement ${new Date(sub.current_period_end).toLocaleDateString()}`
                  : ""}
              </p>
              {(status === "past_due" || status === "unpaid") && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(220,38,38,0.10)",
                    border: "1px solid rgba(220,38,38,0.35)",
                    color: "#991B1B",
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontSize: 14, marginRight: 6 }}>⛔</span>
                  Paiement échoué — votre dernière facture n'a pas pu être prélevée. Mettez à jour
                  votre carte bancaire via <strong>Gérer la facturation</strong> pour éviter la
                  suspension de votre accès.
                </div>
              )}
              {sub?.cancel_at_period_end && sub?.current_period_end && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.10)",
                    border: "1px solid rgba(245,158,11,0.35)",
                    color: "#92400E",
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontSize: 14, marginRight: 6 }}>⚠</span>
                  Annulation prévue — votre accès prendra fin le{" "}
                  <strong>
                    {new Date(sub.current_period_end).toLocaleDateString("fr-CH", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  .
                </div>
              )}
            </div>
            {(isActive || needsCardUpdate) && currentPlan && (
              <button
                type="button"
                onClick={handlePortal}
                disabled={busy === "portal"}
                style={{
                  alignSelf: "flex-start",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "var(--primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: busy === "portal" ? "default" : "pointer",
                  opacity: busy === "portal" ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                {busy === "portal" ? "Ouverture…" : "Gérer la facturation"}
              </button>
            )}
          </div>
        )}
      </Section>

      <Section
        title="Plans & tarifs"
        description="Passez à un plan supérieur pour débloquer plus de bâtiments et de locataires."
      >
        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.08)",
              color: "#B91C1C",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.id && isActive;
            return (
              <div
                key={p.id}
                style={{
                  padding: 20,
                  borderRadius: 14,
                  background: "var(--background)",
                  border: isCurrent ? "2px solid var(--primary)" : "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
                    {p.name}
                  </p>
                  <p className="text-[22px] font-bold mt-1" style={{ color: "var(--foreground)" }}>
                    CHF {p.priceCHF}
                    <span
                      className="text-[12px] font-normal ml-1"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      / {p.period}
                    </span>
                  </p>
                </div>
                <ul
                  style={{
                    padding: 0,
                    margin: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="text-[12px]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      ✓ {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => !isCurrent && handleSubscribe(p.id)}
                  disabled={isCurrent || busy === p.id}
                  style={{
                    marginTop: "auto",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: isCurrent ? "var(--muted)" : "var(--primary)",
                    color: isCurrent ? "var(--muted-foreground)" : "var(--primary-foreground)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isCurrent ? "default" : "pointer",
                  }}
                >
                  {isCurrent
                    ? "Plan actuel"
                    : busy === p.id
                      ? "…"
                      : currentPlan
                        ? "Changer de plan"
                        : "Choisir ce plan"}
                </button>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function CompanyTab() {
  const initial = getLandlordInfo();
  const initialRent = getOrgRentSettings();
  const [companyName, setCompanyName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [vatId, setVatId] = useState(initial.vatId);
  const [iban, setIban] = useState(initial.iban ?? "");
  const [contactEmail, setContactEmail] = useState(initial.email);
  const [rentDueDay, setRentDueDay] = useState<number>(initialRent.rentDueDay);
  const [rentInAdvance, setRentInAdvance] = useState<boolean>(initialRent.rentInAdvance);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveLandlordInfo({ name: companyName, address, email: contactEmail, vatId, iban: iban.trim() });
    const clampedDay = Math.min(28, Math.max(1, Math.round(rentDueDay || 1)));
    saveOrgRentSettings({ rentDueDay: clampedDay, rentInAdvance });
    setRentDueDay(clampedDay);
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
              placeholder="Nom de votre société (optionnel)"
              style={inputStyle}
            />
          </Field>
          <Field label="Contact Email">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@votre-societe.ch"
              style={inputStyle}
            />
          </Field>
          <Field label="Address">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rue, numéro, NPA, ville"
              style={inputStyle}
            />
          </Field>
          <Field label="VAT / Tax ID">
            <input
              type="text"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              placeholder="CHE-XXX.XXX.XXX"
              style={inputStyle}
            />
          </Field>
          <Field label="IBAN (pour QR-factures)">
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="CH93 0076 2011 6238 5295 7"
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
              IBAN suisse ou QR-IBAN. Activera la QR-facture en bas des quittances générées.
            </p>
          </Field>
        </div>
      </Section>

      <Section
        title="Paramètres de loyer"
        description="Règle utilisée pour détecter automatiquement les retards de paiement."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
          <Field label="Jour limite de paiement (1-28)">
            <input
              type="number"
              min={1}
              max={28}
              value={rentDueDay}
              onChange={(e) => setRentDueDay(Number(e.target.value))}
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
              Si le loyer d'un mois n'est pas reçu avant ce jour, il est marqué en retard.
            </p>
          </Field>
          <Field label="Loyer payable">
            <select
              value={rentInAdvance ? "advance" : "arrears"}
              onChange={(e) => setRentInAdvance(e.target.value === "advance")}
              style={inputStyle}
            >
              <option value="advance">Par mois d'avance (convention suisse)</option>
              <option value="arrears">À terme échu</option>
            </select>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
              {rentInAdvance
                ? "Le loyer du mois M doit arriver avant le jour limite de M."
                : "Le loyer du mois M doit arriver avant le jour limite du mois suivant."}
            </p>
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

export function SettingsView({ initialTab }: { initialTab?: TabId } = {}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "profile");

  const tabs: Tab[] = [
    { id: "profile", labelKey: "Profile", icon: User },
    { id: "security", labelKey: "Security", icon: Lock },
    { id: "notifications", labelKey: "Notifications", icon: Bell },
    { id: "appearance", labelKey: "Appearance", icon: Palette },
    { id: "billing", labelKey: t("settingsTabBilling"), icon: CreditCard },
    { id: "company", labelKey: "Company", icon: Building },
    ...(user?.isSuperAdmin ? [{ id: "team" as const, labelKey: "Équipe", icon: UsersIcon }] : []),
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
        {/* Tab nav — vertical on desktop, horizontal scroll on mobile */}
        <div
          className="settings-tabs shrink-0 lg:w-[200px]"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 4,
            overflowX: "auto",
          }}
        >
          <div className="settings-tabs-inner flex lg:flex-col gap-1 w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="settings-tab-btn flex items-center gap-2.5 transition-all whitespace-nowrap"
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
          {activeTab === "team" && <TeamTab />}
        </div>
      </div>
    </div>
  );
}
