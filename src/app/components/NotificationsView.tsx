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
  Wrench,
  Banknote,
  ClipboardCheck,
  AlertTriangle,
  Info,
  ArrowUpDown,
  Tag,
  Building2,
} from "lucide-react";
import {
  getNotifications,
  saveNotifications,
  getBuildings,
  getTenants,
  type Notification,
  type NotificationCategory,
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
    category: "general" as NotificationCategory,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "unread">("newest");
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

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
      category: formData.category,
    };
    const allNotifications = getNotifications();
    saveNotifications([...allNotifications, newNotification]);

    // Build mailto link
    const emailRecipients: string[] = [];
    if (formData.recipientId) {
      const tn = tenants.find((t: any) => t.id === formData.recipientId);
      if (tn?.email) emailRecipients.push(tn.email);
    } else if (formData.buildingId) {
      tenants
        .filter((tn: any) => tn.buildingId === formData.buildingId && tn.email)
        .forEach((tn: any) => emailRecipients.push(tn.email));
    } else {
      tenants
        .filter((tn: any) => tn.email)
        .forEach((tn: any) => emailRecipients.push(tn.email));
    }
    if (emailRecipients.length > 0) {
      const to = emailRecipients[0];
      const bcc = emailRecipients.slice(1).join(",");
      const subject = encodeURIComponent(formData.title);
      const body = encodeURIComponent(formData.message);
      let mailto = `mailto:${to}?subject=${subject}&body=${body}`;
      if (bcc) mailto += `&bcc=${bcc}`;
      window.open(mailto, "_blank");
    }

    setShowCreate(false);
    setFormData({ title: "", message: "", buildingId: "", recipientId: "", category: "general" });
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

  const openNotification = (notif: Notification) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    // Re-fetch to get the updated version
    const fresh = getNotifications().find((n) => n.id === notif.id);
    setSelectedNotif(fresh ? { ...fresh, read: true } : { ...notif, read: true });
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

    // Open mailto with first recipient in TO, rest in BCC
    const emails = recipients.filter((tn: any) => tn.email).map((tn: any) => tn.email);
    if (emails.length > 0) {
      const to = emails[0];
      const bcc = emails.slice(1).join(",");
      const subject = encodeURIComponent(broadcastData.title);
      const body = encodeURIComponent(broadcastData.message);
      let mailto = `mailto:${to}?subject=${subject}&body=${body}`;
      if (bcc) mailto += `&bcc=${bcc}`;
      window.open(mailto, "_blank");
    }

    setShowBroadcast(false);
    loadData();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const CATEGORIES: { id: string; label: string; icon: React.ElementType; color: string }[] = [
    { id: "all", label: t("catAll"), icon: Bell, color: "var(--primary)" },
    { id: "general", label: t("catGeneral"), icon: Info, color: "var(--primary)" },
    { id: "maintenance", label: t("catMaintenance"), icon: Wrench, color: "#B45309" },
    { id: "payment", label: t("catPayment"), icon: Banknote, color: "#15803D" },
    { id: "inspection", label: t("catInspection"), icon: ClipboardCheck, color: "#2563EB" },
    { id: "urgent", label: t("catUrgent"), icon: AlertTriangle, color: "#DC2626" },
  ];

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];
    if (selectedCategory !== "all") {
      result = result.filter((n) => (n.category || "general") === selectedCategory);
    }
    if (sortMode === "newest") result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sortMode === "oldest") result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sortMode === "unread") result.sort((a, b) => (a.read === b.read ? new Date(b.date).getTime() - new Date(a.date).getTime() : a.read ? 1 : -1));
    return result;
  }, [notifications, selectedCategory, sortMode]);

  const getCategoryMeta = (cat?: NotificationCategory) => {
    const found = CATEGORIES.find((c) => c.id === (cat || "general"));
    return found || CATEGORIES[1];
  };

  return (
    <div style={{ padding: "32px 36px 48px" }}>
      {/* ── Header row: title + button ──────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 20 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 600, lineHeight: 1.2, margin: 0,
              color: "var(--foreground)",
              borderLeft: "4px solid var(--primary)",
              paddingLeft: 14,
            }}>
              {t("notificationsTitle")}
            </h1>
            {unreadCount > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(239,68,68,0.08)", color: "#DC2626",
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 4, paddingLeft: 18 }}>
            {user?.role === "admin" ? t("notificationsSub") : t("notificationsSubTenant")}
          </p>
        </div>

        {user?.role === "admin" && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "var(--primary)", color: "var(--primary-foreground)",
              border: "none", cursor: "pointer", flexShrink: 0,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            {t("newNotification")}
          </button>
        )}
      </div>

      {/* ── Categories + Sort ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            const count = cat.id === "all"
              ? notifications.length
              : notifications.filter((n) => (n.category || "general") === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                  border: active ? `1px solid ${cat.color}` : "1px solid var(--border)",
                  background: active ? `${cat.color}0D` : "var(--card)",
                  color: active ? cat.color : "var(--muted-foreground)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--background)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? `${cat.color}0D` : "var(--card)"; }}
              >
                <Icon style={{ width: 12, height: 12 }} />
                {cat.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, marginLeft: 2,
                    padding: "0 5px", borderRadius: 99,
                    background: active ? `${cat.color}15` : "var(--background)",
                    color: active ? cat.color : "var(--muted-foreground)",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sort dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <ArrowUpDown style={{ width: 12, height: 12, color: "var(--muted-foreground)" }} />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
            style={{
              fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 7,
              border: "1px solid var(--border)", background: "var(--card)",
              color: "var(--muted-foreground)", cursor: "pointer", outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="oldest">{t("sortOldest")}</option>
            <option value="unread">{t("sortUnread")}</option>
          </select>
        </div>
      </div>

      {/* ── Notification list ─────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredNotifications.length === 0 ? (
          <div style={{
            padding: "56px 24px", borderRadius: 16, textAlign: "center",
            background: "var(--card)", border: "1px solid var(--border)",
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, margin: "0 auto 14px",
              background: "var(--sidebar-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bell style={{ width: 22, height: 22, color: "var(--muted-foreground)" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)", margin: 0 }}>
              {t("noNotifications")}
            </p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
              {user?.role === "admin" ? t("noNotifAdmin") : t("noNotifTenant")}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isUnread = !notif.read;
            const catMeta = getCategoryMeta(notif.category);
            const accentColor = isUnread ? catMeta.color : "var(--border)";
            return (
              <div
                key={notif.id}
                className="group"
                style={{
                  borderRadius: 14, overflow: "hidden",
                  background: isUnread ? "rgba(69,85,58,0.03)" : "var(--card)",
                  border: isUnread ? "1px solid rgba(69,85,58,0.18)" : "1px solid var(--border)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  cursor: "pointer",
                }}
                onClick={() => openNotification(notif)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(69,85,58,0.25)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isUnread ? "rgba(69,85,58,0.18)" : "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex" }}>
                  {/* Left accent bar */}
                  <div style={{ width: 4, flexShrink: 0, background: accentColor }} />

                  <div style={{ flex: 1, padding: "14px 16px" }}>
                    {/* Top: title + badges + actions */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Unread dot */}
                        {isUnread && (
                          <span style={{
                            width: 8, height: 8, borderRadius: 99, flexShrink: 0,
                            background: catMeta.color,
                            boxShadow: `0 0 0 3px ${catMeta.color}20`,
                          }} />
                        )}
                        <h3 style={{
                          fontSize: 14, fontWeight: isUnread ? 650 : 500,
                          color: isUnread ? "var(--foreground)" : "var(--muted-foreground)", margin: 0, lineHeight: 1.3,
                        }}>
                          {notif.title}
                        </h3>
                        {/* Category badge */}
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                          background: `${catMeta.color}0D`, color: catMeta.color,
                          flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.03em",
                        }}>
                          {(() => { const CatIcon = catMeta.icon; return <CatIcon style={{ width: 9, height: 9 }} />; })()}
                          {catMeta.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {isUnread && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                            background: "rgba(69,85,58,0.1)", color: "var(--primary)",
                          }}>
                            {t("newLabel")}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          {formatRelativeDate(notif.date)}
                        </span>
                        {/* Mark as read */}
                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                            title={t("markAsRead")}
                            style={{
                              width: 26, height: 26, borderRadius: 7,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: "none", background: "transparent", cursor: "pointer",
                              color: "#15803D", transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <CheckCircle style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                        {/* Delete (admin) */}
                        {user?.role === "admin" && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                            title={t("confirmDeleteNotif")}
                            className="opacity-0 group-hover:opacity-100"
                            style={{
                              width: 26, height: 26, borderRadius: 7,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: "none", background: "transparent", cursor: "pointer",
                              color: "var(--muted-foreground)", transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#DC2626"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message preview */}
                    <p style={{
                      fontSize: 12, lineHeight: 1.5, color: "var(--muted-foreground)", margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {notif.message}
                    </p>

                    {/* Broadcast button for inspection notifications */}
                    {user?.role === "admin" && isInspection(notif.title) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openBroadcast(notif); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, marginTop: 10,
                          background: "var(--background)", border: "1px solid var(--border)",
                          color: "var(--foreground)", cursor: "pointer", transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        <Megaphone style={{ width: 13, height: 13 }} />
                        {t("alertTenants")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────── */}
      {selectedNotif && (() => {
        const detailCat = getCategoryMeta(selectedNotif.category);
        const DetailCatIcon = detailCat.icon;
        const building = selectedNotif.buildingId ? buildingsById.get(selectedNotif.buildingId) : null;
        const recipient = selectedNotif.recipientId ? tenants.find((tn: any) => tn.id === selectedNotif.recipientId) : null;
        return createPortal(
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.35)", padding: 16,
            }}
            onClick={() => setSelectedNotif(null)}
          >
            <div
              style={{
                width: "100%", maxWidth: 520, maxHeight: "85vh",
                borderRadius: 16, overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--card)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
                display: "flex", flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with accent */}
              <div style={{
                padding: "18px 22px",
                borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: `${detailCat.color}0D`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderLeft: `3px solid ${detailCat.color}`,
                }}>
                  <DetailCatIcon style={{ width: 18, height: 18, color: detailCat.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 650, color: "var(--foreground)" }}>
                      {selectedNotif.title}
                    </span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                      background: `${detailCat.color}0D`, color: detailCat.color,
                      textTransform: "uppercase", letterSpacing: "0.03em",
                    }}>
                      {detailCat.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {new Date(selectedNotif.date).toLocaleDateString("fr-CH", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNotif(null)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "none",
                    color: "var(--muted-foreground)", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
                {/* Metadata chips */}
                {(building || recipient) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {building && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, padding: "5px 10px", borderRadius: 8,
                        background: "var(--background)", border: "1px solid var(--border)",
                        color: "var(--foreground)",
                      }}>
                        <Building2 style={{ width: 11, height: 11, color: "var(--muted-foreground)" }} />
                        {building.name}
                      </span>
                    )}
                    {recipient && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, padding: "5px 10px", borderRadius: 8,
                        background: "var(--background)", border: "1px solid var(--border)",
                        color: "var(--foreground)",
                      }}>
                        <Bell style={{ width: 11, height: 11, color: "var(--muted-foreground)" }} />
                        {recipient.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Full message */}
                <p style={{
                  fontSize: 13, lineHeight: 1.7, color: "var(--foreground)", margin: 0,
                  whiteSpace: "pre-wrap",
                }}>
                  {selectedNotif.message}
                </p>
              </div>

              {/* Footer actions */}
              <div style={{
                padding: "14px 22px",
                borderTop: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end",
              }}>
                {user?.role === "admin" && isInspection(selectedNotif.title) && (
                  <button
                    onClick={() => { openBroadcast(selectedNotif); setSelectedNotif(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 550,
                      border: "1px solid var(--border)", background: "var(--card)",
                      color: "var(--foreground)", cursor: "pointer", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
                  >
                    <Megaphone style={{ width: 13, height: 13 }} />
                    {t("alertTenants")}
                  </button>
                )}
                {user?.role === "admin" && (
                  <button
                    onClick={() => { handleDelete(selectedNotif.id); setSelectedNotif(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 550,
                      border: "1px solid rgba(239,68,68,0.2)", background: "transparent",
                      color: "#DC2626", cursor: "pointer", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                    {t("confirmDeleteNotif")}
                  </button>
                )}
                <button
                  onClick={() => setSelectedNotif(null)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 550,
                    border: "none", cursor: "pointer",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── Create Modal ──────────────────────────────────────── */}
      {showCreate && (
        <ModalShell onClose={() => setShowCreate(false)} icon={<Bell style={{ width: 20, height: 20, color: "var(--primary)" }} />} title={t("newNotification")} subtitle={t("notificationsSub")}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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

              <FieldGroup label={t("notifCategory")}>
                <ModalSelect
                  value={formData.category}
                  onChange={(v) => setFormData({ ...formData, category: v as NotificationCategory })}
                  placeholder={t("catGeneral")}
                  options={[
                    { value: "general", label: t("catGeneral") },
                    { value: "maintenance", label: t("catMaintenance") },
                    { value: "payment", label: t("catPayment") },
                    { value: "inspection", label: t("catInspection") },
                    { value: "urgent", label: t("catUrgent") },
                  ]}
                />
              </FieldGroup>
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
              <ModalBtn type="submit" primary>
                <Send style={{ width: 14, height: 14 }} />
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
        <ModalShell onClose={() => setShowBroadcast(false)} icon={<Megaphone style={{ width: 20, height: 20, color: "var(--primary)" }} />} title={t("broadcastTitle")} subtitle={t("notificationsSub")}>
          <form onSubmit={sendBroadcast} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
                {t("recipients")}:{" "}
                <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
                  {broadcastData.buildingId
                    ? tenants.filter((tn) => tn.buildingId === broadcastData.buildingId).length
                    : 0}
                </span>
              </p>
            </FieldGroup>

            <FieldGroup label={t("broadcastSubject")}>
              <ModalInput
                value={broadcastData.title}
                onChange={(v) => setBroadcastData({ ...broadcastData, title: v })}
              />
            </FieldGroup>

            <FieldGroup label={t("broadcastMessage")}>
              <ModalTextarea
                value={broadcastData.message}
                onChange={(v) => setBroadcastData({ ...broadcastData, message: v })}
                rows={8}
              />
            </FieldGroup>

            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
              <ModalBtn type="submit" primary>
                <Send style={{ width: 14, height: 14 }} />
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

function ModalShell({
  children,
  onClose,
  icon,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  onClose: () => void;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 580,
          maxHeight: "88vh", overflowY: "auto",
          borderRadius: 24,
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with accent bar */}
        <div style={{ position: "relative", padding: "28px 32px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "absolute", top: 0, left: 32, right: 32, height: 3, borderRadius: "0 0 3px 3px", background: "var(--primary)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {icon && (
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {icon}
              </div>
            )}
            <div>
              {title && <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{title}</h2>}
              {subtitle && <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, marginTop: 2 }}>{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute", top: 20, right: 20,
              width: 36, height: 36, borderRadius: 10,
              border: "none", background: "transparent",
              color: "var(--muted-foreground)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: "24px 32px 28px" }}>
          {children}
        </div>
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
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "11px 14px", borderRadius: 12, fontSize: 13,
        border: "1px solid var(--border)",
        background: "var(--background)",
        color: "var(--foreground)",
        outline: "none",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
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
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "11px 14px", borderRadius: 12, fontSize: 13,
        border: "1px solid var(--border)",
        background: "var(--background)",
        color: "var(--foreground)",
        outline: "none", resize: "none",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
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
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "11px 14px", borderRadius: 12, fontSize: 13,
        border: "1px solid var(--border)",
        background: "var(--background)",
        color: "var(--foreground)",
        outline: "none",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
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
