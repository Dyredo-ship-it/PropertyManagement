import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Plus,
  Send,
  Trash2,
  CheckCircle,
  Megaphone,
  X,
} from "lucide-react";
import {
  getNotifications,
  saveNotifications,
  getBuildings,
  getTenants,
  type Notification,
} from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

/* ─── Helpers ─────────────────────────────────────────────────── */

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString("fr-CA");
}

function todayFr() {
  return new Date().toLocaleDateString("fr-CH");
}

function inspectionTemplate(params: { buildingName?: string }) {
  return `Objet : Inspection annuelle – ${params.buildingName ?? "Bâtiment"}

Bonjour,

Nous vous informons qu'une inspection annuelle aura lieu prochainement.
Merci de vous assurer qu'une personne soit présente ou de nous contacter pour convenir d'un créneau.

Cordialement,
La gérance / Le propriétaire

Envoyé le ${todayFr()}`;
}

/* ─── Component ───────────────────────────────────────────────── */

export function NotificationsView() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    buildingId: "",
    recipientId: "",
  });

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: "Inspection annuelle",
    message: "",
    buildingId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const buildingsById = useMemo(() => {
    const map = new Map<string, any>();
    buildings.forEach((b) => map.set(b.id, b));
    return map;
  }, [buildings]);

  const loadData = () => {
    const allNotifications = getNotifications();
    if (user?.role === "tenant") {
      setNotifications(
        allNotifications.filter((n) => n.recipientId === user.id || !n.recipientId)
      );
    } else {
      setNotifications(allNotifications);
    }
    setBuildings(getBuildings());
    setTenants(getTenants());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newNotification: Notification = {
      id: Date.now().toString(),
      title: formData.title,
      message: formData.message,
      date: new Date().toISOString(),
      read: false,
      buildingId: formData.buildingId || undefined,
      recipientId: formData.recipientId || undefined,
    };
    const allNotifications = getNotifications();
    saveNotifications([...allNotifications, newNotification]);
    setShowCreate(false);
    setFormData({ title: "", message: "", buildingId: "", recipientId: "" });
    loadData();
  };

  const handleMarkAsRead = (id: string) => {
    const allNotifications = getNotifications();
    const updated = allNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteNotif"))) {
      const allNotifications = getNotifications();
      saveNotifications(allNotifications.filter((n) => n.id !== id));
      loadData();
    }
  };

  const isInspection = (title: string) =>
    title.toLowerCase().includes("inspection");

  const openBroadcast = (notification: Notification) => {
    const inferredBuildingId = (notification as any).buildingId ?? "";
    const buildingName = inferredBuildingId
      ? buildingsById.get(inferredBuildingId)?.name
      : undefined;
    setBroadcastData({
      title: "Inspection annuelle",
      buildingId: inferredBuildingId,
      message: inspectionTemplate({ buildingName }),
    });
    setShowBroadcast(true);
  };

  const sendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.buildingId) {
      alert("Choisis un bâtiment avant d'envoyer.");
      return;
    }
    const recipients = tenants.filter(
      (tn) => tn.buildingId === broadcastData.buildingId
    );
    if (recipients.length === 0) {
      alert("Aucun locataire trouvé pour ce bâtiment.");
      return;
    }
    const nowIso = new Date().toISOString();
    const allNotifications = getNotifications();
    const generated: Notification[] = recipients.map((tn) => ({
      id: `${Date.now()}-${tn.id}-${Math.random().toString(16).slice(2)}`,
      title: broadcastData.title,
      message: broadcastData.message,
      date: nowIso,
      read: false,
      buildingId: broadcastData.buildingId,
      recipientId: tn.id,
    }));
    saveNotifications([...allNotifications, ...generated]);
    setShowBroadcast(false);
    loadData();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-4"
        style={{ marginBottom: 28 }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-[22px] font-semibold leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              {t("notificationsTitle")}
            </h1>
            {unreadCount > 0 && (
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  color: "#DC2626",
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {user?.role === "admin"
              ? t("notificationsSub")
              : t("notificationsSubTenant")}
          </p>
        </div>

        {user?.role === "admin" && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-[13px] font-medium transition-colors shrink-0"
            style={{
              padding: "10px 20px",
              borderRadius: 14,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            <Plus className="w-4 h-4" />
            {t("newNotification")}
          </button>
        )}
      </div>

      {/* ── Notification list ─────────────────────────────────── */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              padding: "64px 24px",
              borderRadius: 16,
              border: "none",
              background: "var(--card)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--sidebar-accent)" }}
            >
              <Bell
                className="w-6 h-6"
                style={{ color: "var(--muted-foreground)" }}
              />
            </div>
            <p
              className="text-[14px] font-medium mt-4"
              style={{ color: "var(--foreground)" }}
            >
              {t("noNotifications")}
            </p>
            <p
              className="text-[12px] mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {user?.role === "admin" ? t("noNotifAdmin") : t("noNotifTenant")}
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                style={{
                  borderRadius: 16,
                  border: "none",
                  background: isUnread ? "var(--sidebar-accent)" : "var(--card)",
                  padding: "18px 20px",
                  opacity: isUnread ? 1 : 0.75,
                  transition: "all 0.15s ease",
                }}
              >
                <div className="flex items-start gap-3.5">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: isUnread
                        ? "rgba(69,85,58,0.08)"
                        : "var(--background)",
                      color: isUnread
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    <Bell className="w-[18px] h-[18px]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3
                        className="text-[14px] leading-snug"
                        style={{
                          color: "var(--foreground)",
                          fontWeight: isUnread ? 600 : 400,
                        }}
                      >
                        {notif.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnread && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(69,85,58,0.08)",
                              color: "var(--primary)",
                            }}
                          >
                            {t("newLabel")}
                          </span>
                        )}
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {formatRelativeDate(notif.date)}
                        </span>
                      </div>
                    </div>

                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {notif.message}
                    </p>

                    {/* Broadcast button for inspection notifications */}
                    {user?.role === "admin" && isInspection(notif.title) && (
                      <button
                        onClick={() => openBroadcast(notif)}
                        className="flex items-center gap-1.5 text-[12px] font-medium mt-3 transition-colors"
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "var(--background)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                        }}
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        {t("alertTenants")}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isUnread && user?.role === "tenant" && (
                      <IconBtn
                        onClick={() => handleMarkAsRead(notif.id)}
                        title={t("markAsRead")}
                      >
                        <CheckCircle className="w-4 h-4" style={{ color: "#15803D" }} />
                      </IconBtn>
                    )}
                    {user?.role === "admin" && (
                      <IconBtn
                        onClick={() => handleDelete(notif.id)}
                        title={t("confirmDeleteNotif")}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: "#DC2626" }} />
                      </IconBtn>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Create Modal ──────────────────────────────────────── */}
      {showCreate && (
        <ModalShell onClose={() => setShowCreate(false)}>
          <h2
            className="text-[17px] font-semibold mb-6"
            style={{ color: "var(--foreground)" }}
          >
            {t("newNotification")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup label={t("notifTitle")}>
              <ModalInput
                value={formData.title}
                onChange={(v) => setFormData({ ...formData, title: v })}
                placeholder="Ex: Réparation de la porte d'entrée"
                required
              />
            </FieldGroup>

            <FieldGroup label={t("notifMessage")}>
              <ModalTextarea
                value={formData.message}
                onChange={(v) => setFormData({ ...formData, message: v })}
                placeholder="Ex: Bonjour, la porte d'entrée du bâtiment a été réparée."
                rows={4}
                required
              />
            </FieldGroup>

            <FieldGroup label={t("notifBuilding")}>
              <ModalSelect
                value={formData.buildingId}
                onChange={(v) => setFormData({ ...formData, buildingId: v })}
                placeholder={t("allBuildingsOption")}
                options={buildings.map((b) => ({ value: b.id, label: b.name }))}
              />
            </FieldGroup>

            <FieldGroup label={t("notifRecipient")}>
              <ModalSelect
                value={formData.recipientId}
                onChange={(v) => setFormData({ ...formData, recipientId: v })}
                placeholder={t("allTenantsOption")}
                options={tenants.map((tn) => ({
                  value: tn.id,
                  label: `${tn.name} - ${tn.buildingName}`,
                }))}
              />
            </FieldGroup>

            <div className="flex gap-3 pt-2">
              <ModalBtn type="submit" primary>
                <Send className="w-3.5 h-3.5" />
                {t("send")}
              </ModalBtn>
              <ModalBtn type="button" onClick={() => setShowCreate(false)}>
                {t("cancel")}
              </ModalBtn>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ── Broadcast Modal ───────────────────────────────────── */}
      {showBroadcast && (
        <ModalShell onClose={() => setShowBroadcast(false)}>
          <h2
            className="text-[17px] font-semibold mb-6"
            style={{ color: "var(--foreground)" }}
          >
            {t("broadcastTitle")}
          </h2>

          <form onSubmit={sendBroadcast} className="space-y-5">
            <FieldGroup label={t("building")}>
              <ModalSelect
                value={broadcastData.buildingId}
                onChange={(v) => {
                  const buildingName = v ? buildingsById.get(v)?.name : undefined;
                  setBroadcastData((prev) => ({
                    ...prev,
                    buildingId: v,
                    message: inspectionTemplate({ buildingName }),
                  }));
                }}
                placeholder={t("selectBuilding")}
                options={buildings.map((b) => ({ value: b.id, label: b.name }))}
              />
              <p className="mt-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {t("recipients")}:{" "}
                <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
                  {broadcastData.buildingId
                    ? tenants.filter((tn) => tn.buildingId === broadcastData.buildingId)
                        .length
                    : 0}
                </span>
              </p>
            </FieldGroup>

            <FieldGroup label={t("broadcastSubject")}>
              <ModalInput
                value={broadcastData.title}
                onChange={(v) =>
                  setBroadcastData({ ...broadcastData, title: v })
                }
              />
            </FieldGroup>

            <FieldGroup label={t("broadcastMessage")}>
              <ModalTextarea
                value={broadcastData.message}
                onChange={(v) =>
                  setBroadcastData({ ...broadcastData, message: v })
                }
                rows={8}
              />
            </FieldGroup>

            <div className="flex gap-3 pt-2">
              <ModalBtn type="submit" primary>
                <Send className="w-3.5 h-3.5" />
                {t("sendToAll")}
              </ModalBtn>
              <ModalBtn type="button" onClick={() => setShowBroadcast(false)}>
                {t("cancel")}
              </ModalBtn>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

/* ─── Reusable sub-components ─────────────────────────────────── */

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
      style={{ color: "var(--muted-foreground)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--background)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", padding: 16 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg relative"
        style={{
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--card)",
          padding: 28,
          boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--background)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[12px] font-medium mb-1.5"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full text-[13px] outline-none"
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    />
  );
}

function ModalTextarea({
  value,
  onChange,
  placeholder,
  rows,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows || 4}
      required={required}
      className="w-full text-[13px] outline-none resize-none"
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    />
  );
}

function ModalSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[13px] outline-none"
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ModalBtn({
  children,
  type,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  type: "submit" | "button";
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 text-[13px] font-medium transition-colors"
      style={{
        padding: "10px 0",
        borderRadius: 12,
        background: primary ? "var(--primary)" : "var(--card)",
        color: primary ? "var(--primary-foreground)" : "var(--foreground)",
        border: primary ? "none" : "1px solid var(--border)",
      }}
      onMouseEnter={(e) => {
        if (primary) e.currentTarget.style.opacity = "0.9";
        else e.currentTarget.style.background = "var(--background)";
      }}
      onMouseLeave={(e) => {
        if (primary) e.currentTarget.style.opacity = "1";
        else e.currentTarget.style.background = "var(--card)";
      }}
    >
      {children}
    </button>
  );
}
