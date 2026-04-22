import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  getNotifications,
  saveNotifications,
  addNotification as storageAddNotification,
  type Notification,
} from "../utils/storage";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (
    n: Omit<Notification, "id" | "date" | "read"> & Partial<Pick<Notification, "id" | "date" | "read">>,
  ) => Notification;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 20_000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [all, setAll] = useState<Notification[]>([]);

  const refresh = useCallback(() => {
    setAll(getNotifications());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const notifications = useMemo(() => {
    if (!user) return [];
    if (user.role === "tenant") {
      return all.filter((n) => n.recipientId === user.id || !n.recipientId);
    }
    return all;
  }, [all, user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markAsRead = useCallback((id: string) => {
    const current = getNotifications();
    const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(next);
    setAll(next);
  }, []);

  const markAllAsRead = useCallback(() => {
    const current = getNotifications();
    const next = current.map((n) => {
      if (n.read) return n;
      if (user?.role === "tenant" && n.recipientId && n.recipientId !== user.id) return n;
      return { ...n, read: true };
    });
    saveNotifications(next);
    setAll(next);
  }, [user]);

  const deleteNotification = useCallback((id: string) => {
    const current = getNotifications();
    const next = current.filter((n) => n.id !== id);
    saveNotifications(next);
    setAll(next);
  }, []);

  const addNotification = useCallback<NotificationsContextType["addNotification"]>((n) => {
    const created = storageAddNotification(n);
    setAll(getNotifications());
    // Fire-and-forget web push dispatch. If the notification hasn't been
    // persisted to Supabase yet (async sync), the edge function will still
    // find it thanks to the later sync — but we give the client a small
    // window by waiting the next tick. Errors are swallowed so a failed
    // push never blocks the UI.
    const idForPush = created.id;
    setTimeout(() => {
      supabase.functions
        .invoke("send-push", { body: { notificationId: idForPush } })
        .catch(() => {
          /* ignore — push is best-effort */
        });
    }, 1500);
    return created;
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addNotification,
        refresh,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextType {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return ctx;
}
