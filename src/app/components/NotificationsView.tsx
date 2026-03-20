import React, { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Send, Trash2, CheckCircle, Megaphone } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getNotifications,
  saveNotifications,
  getBuildings,
  getTenants,
  type Notification,
} from "../utils/storage";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

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
  return `Objet : Inspection annuelle \u2013 ${params.buildingName ?? "B\u00E2timent"}

Bonjour,

Nous vous informons qu'une inspection annuelle aura lieu prochainement.
Merci de vous assurer qu'une personne soit pr\u00E9sente ou de nous contacter pour convenir d'un cr\u00E9neau.

Cordialement,
La g\u00E9rance / Le propri\u00E9taire

Envoy\u00E9 le ${todayFr()}`;
}

export function NotificationsView() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    buildingId: "",
    recipientId: "",
  });

  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: "Inspection annuelle",
    message: "",
    buildingId: "",
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    setIsDialogOpen(false);
    setFormData({ title: "", message: "", buildingId: "", recipientId: "" });
    loadData();
  };

  const handleMarkAsRead = (id: string) => {
    const allNotifications = getNotifications();
    const updated = allNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDeleteNotif"))) {
      const allNotifications = getNotifications();
      const updated = allNotifications.filter((n) => n.id !== id);
      saveNotifications(updated);
      loadData();
    }
  };

  const isInspection = (title: string) => title.toLowerCase().includes("inspection");

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

    setIsBroadcastOpen(true);
  };

  const sendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();

    if (!broadcastData.buildingId) {
      alert("Choisis un b\u00E2timent avant d'envoyer.");
      return;
    }

    const recipients = tenants.filter((tn) => tn.buildingId === broadcastData.buildingId);
    if (recipients.length === 0) {
      alert("Aucun locataire trouv\u00E9 pour ce b\u00E2timent.");
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
    setIsBroadcastOpen(false);
    loadData();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-[#171414]">{t("notificationsTitle")}</h1>
          <p className="text-[#6B6560]">
            {user?.role === "admin"
              ? t("notificationsSub")
              : t("notificationsSubTenant")}
          </p>
        </div>

        {user?.role === "admin" && (
          <>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#45553A] hover:bg-[#3a4930] text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  {t("newNotification")}
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-white border-[#E8E5DB]">
                <DialogHeader>
                  <DialogTitle className="text-[#171414]">{t("newNotification")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title" className="text-[#171414]">{t("notifTitle")}</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Ex: R\u00E9paration de la porte d'entr\u00E9e"
                      className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-[#171414]">{t("notifMessage")}</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      placeholder="Ex: Bonjour, la porte d'entr\u00E9e du b\u00E2timent a \u00E9t\u00E9 r\u00E9par\u00E9e."
                      rows={4}
                      className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="building" className="text-[#171414]">{t("notifBuilding")}</Label>
                    <Select
                      value={formData.buildingId}
                      onValueChange={(value) => setFormData({ ...formData, buildingId: value })}
                    >
                      <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                        <SelectValue placeholder={t("allBuildingsOption")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t("allBuildingsOption")}</SelectItem>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recipient" className="text-[#171414]">{t("notifRecipient")}</Label>
                    <Select
                      value={formData.recipientId}
                      onValueChange={(value) => setFormData({ ...formData, recipientId: value })}
                    >
                      <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                        <SelectValue placeholder={t("allTenantsOption")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t("allTenantsOption")}</SelectItem>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name} - {tenant.buildingName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1 bg-[#45553A] hover:bg-[#3a4930] text-white">
                      <Send className="w-4 h-4 mr-2" />
                      {t("send")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 border-[#E8E5DB] text-[#171414]"
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dialog broadcast */}
            <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
              <DialogContent className="bg-white border-[#E8E5DB]">
                <DialogHeader>
                  <DialogTitle className="text-[#171414]">{t("broadcastTitle")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={sendBroadcast} className="space-y-4 mt-4">
                  <div>
                    <Label className="text-[#171414]">{t("building")}</Label>
                    <Select
                      value={broadcastData.buildingId}
                      onValueChange={(value) => {
                        const buildingName = value ? buildingsById.get(value)?.name : undefined;
                        setBroadcastData((prev) => ({
                          ...prev,
                          buildingId: value,
                          message: inspectionTemplate({ buildingName }),
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2">
                        <SelectValue placeholder={t("selectBuilding")} />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <p className="mt-2 text-xs text-[#6B6560]">
                      {t("recipients")}:{" "}
                      <span className="text-[#171414]">
                        {broadcastData.buildingId
                          ? tenants.filter((tn) => tn.buildingId === broadcastData.buildingId).length
                          : 0}
                      </span>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="btitle" className="text-[#171414]">{t("broadcastSubject")}</Label>
                    <Input
                      id="btitle"
                      value={broadcastData.title}
                      onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                      className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bmsg" className="text-[#171414]">{t("broadcastMessage")}</Label>
                    <Textarea
                      id="bmsg"
                      value={broadcastData.message}
                      onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                      rows={8}
                      className="bg-[#FAF5F2] border-[#E8E5DB] text-[#171414] mt-2"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 bg-[#45553A] hover:bg-[#3a4930] text-white">
                      <Send className="w-4 h-4 mr-2" />
                      {t("sendToAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-[#E8E5DB] text-[#171414]"
                      onClick={() => setIsBroadcastOpen(false)}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`p-6 bg-white border border-[#E8E5DB] shadow-sm rounded-xl ${
              notification.read ? "opacity-60" : "border-[#45553A]/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      notification.read ? "bg-gray-100" : "bg-[#45553A]/10"
                    }`}
                  >
                    <Bell
                      className={`w-5 h-5 ${
                        notification.read ? "text-[#6B6560]" : "text-[#45553A]"
                      }`}
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg text-[#171414]">{notification.title}</h3>
                    <p className="text-sm text-[#6B6560]">
                      {formatRelativeDate(notification.date)}
                    </p>
                  </div>

                  {!notification.read && (
                    <span className="px-3 py-1 bg-[#45553A]/10 text-[#45553A] rounded-full text-xs">
                      {t("newLabel")}
                    </span>
                  )}
                </div>

                <p className="text-[#6B6560] ml-13">{notification.message}</p>

                {user?.role === "admin" && isInspection(notification.title) && (
                  <div className="mt-4 ml-13">
                    <Button
                      type="button"
                      className="bg-[#FAF5F2] hover:bg-[#E8E5DB]/50 border border-[#E8E5DB] text-[#171414]"
                      onClick={() => openBroadcast(notification)}
                    >
                      <Megaphone className="w-4 h-4 mr-2" />
                      {t("alertTenants")}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                {!notification.read && user?.role === "tenant" && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                    title={t("markAsRead")}
                  >
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </button>
                )}

                {user?.role === "admin" && (
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title={t("confirmDeleteNotif")}
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {notifications.length === 0 && (
        <Card className="p-12 bg-white border border-[#E8E5DB] shadow-sm text-center rounded-xl">
          <Bell className="w-16 h-16 text-[#6B6560] mx-auto mb-4" />
          <h3 className="text-xl mb-2 text-[#171414]">{t("noNotifications")}</h3>
          <p className="text-[#6B6560]">
            {user?.role === "admin"
              ? t("noNotifAdmin")
              : t("noNotifTenant")}
          </p>
        </Card>
      )}
    </div>
  );
}
