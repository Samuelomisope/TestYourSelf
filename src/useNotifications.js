import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch } from "./api";
import { useAuth } from "./useAuth";

function normalizeNotification(notification) {
  return {
    ...notification,
    message: notification.message || notification.body || notification.title || "You have a new notification.",
    read: notification.read ?? notification.isRead ?? false,
    createdAt: notification.createdAt ? new Date(notification.createdAt) : null,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet("/notifications");
      setNotifications(Array.isArray(data) ? data.map(normalizeNotification) : []);
    } catch {
      // A notification fetch should not disrupt the rest of the app.
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return undefined;
    }

    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [user?.id, refresh]);

  const markAsRead = useCallback(async (id) => {
    await apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {});
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  return { notifications, unreadCount, markAsRead, refresh };
}
