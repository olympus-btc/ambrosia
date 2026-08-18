"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ADMIN_NOTIFICATION_CATEGORY_WALLET,
  ADMIN_NOTIFICATIONS_CONNECTION_CHANGED_EVENT,
  ADMIN_NOTIFICATIONS_LIVE_CONNECTED_STATE_KEY,
  ADMIN_NOTIFICATIONS_NEW_EVENT,
  ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT,
} from "@/lib/adminNotifications";
import {
  deleteAdminNotification,
  deleteAllAdminNotifications,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "@/services/adminNotificationsService";

const DEFAULT_FILTERS = {
  category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
  unreadOnly: false,
};

function requestUnreadCountRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT));
}

function mergeIncomingNotification(notifications, incomingNotification) {
  if (!incomingNotification?.id) return notifications;
  const incomingNotificationAlreadyExists = notifications.some(
    (notification) => notification.id === incomingNotification.id,
  );
  if (incomingNotificationAlreadyExists) {
    return notifications.map((notification) => (
      notification.id === incomingNotification.id ? { ...notification, ...incomingNotification } : notification
    ));
  }
  return [incomingNotification, ...notifications];
}

function markNotificationReadLocally(notifications, notificationId, unreadOnly) {
  const notificationReadAt = new Date().toISOString();
  const notificationsWithReadState = notifications.map((notification) => (
    notification.id === notificationId
      ? { ...notification, readAt: notification.readAt || notificationReadAt }
      : notification
  ));

  if (!unreadOnly) return notificationsWithReadState;

  return notificationsWithReadState.filter((notification) => !notification.readAt);
}

function markFilteredNotificationsReadLocally(notifications, category, unreadOnly) {
  const notificationReadAt = new Date().toISOString();
  const notificationMatchesActiveCategory = (notification) => (
    !category || notification.category === category
  );

  if (unreadOnly) {
    return notifications.filter((notification) => !notificationMatchesActiveCategory(notification));
  }

  return notifications.map((notification) => (
    notificationMatchesActiveCategory(notification)
      ? { ...notification, readAt: notification.readAt || notificationReadAt }
      : notification
  ));
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  const fetchNotifications = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedNotifications = await getAdminNotifications({
        ...nextFilters,
        limit: 100,
      });
      setNotifications(Array.isArray(fetchedNotifications) ? fetchedNotifications : []);
    } catch (fetchError) {
      setError(fetchError);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((nextFilters) => {
    setFilters((currentFilters) => ({ ...currentFilters, ...nextFilters }));
  }, []);

  const markRead = useCallback(async (notificationId) => {
    await markAdminNotificationRead(notificationId);
    setNotifications((currentNotifications) => (
      markNotificationReadLocally(currentNotifications, notificationId, filters.unreadOnly)
    ));
    requestUnreadCountRefresh();
  }, [filters.unreadOnly]);

  const markAllRead = useCallback(async () => {
    await markAllAdminNotificationsRead(filters.category);
    setNotifications((currentNotifications) => (
      markFilteredNotificationsReadLocally(currentNotifications, filters.category, filters.unreadOnly)
    ));
    requestUnreadCountRefresh();
  }, [filters.category, filters.unreadOnly]);

  const deleteNotification = useCallback(async (notificationId) => {
    await deleteAdminNotification(notificationId);
    setNotifications((currentNotifications) => (
      currentNotifications.filter((notification) => notification.id !== notificationId)
    ));
    requestUnreadCountRefresh();
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    await deleteAllAdminNotifications(filters.category);
    setNotifications((currentNotifications) => (
      filters.category
        ? currentNotifications.filter((notification) => notification.category !== filters.category)
        : []
    ));
    requestUnreadCountRefresh();
  }, [filters.category]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    setLiveConnected(Boolean(window[ADMIN_NOTIFICATIONS_LIVE_CONNECTED_STATE_KEY]));

    const handleLiveNotification = (liveNotificationEvent) => {
      setNotifications((currentNotifications) => mergeIncomingNotification(
        currentNotifications,
        liveNotificationEvent.detail?.notification,
      ));
    };
    const handleConnectionChanged = (connectionChangedEvent) => {
      setLiveConnected(Boolean(connectionChangedEvent.detail?.connected));
    };

    window.addEventListener(ADMIN_NOTIFICATIONS_NEW_EVENT, handleLiveNotification);
    window.addEventListener(ADMIN_NOTIFICATIONS_CONNECTION_CHANGED_EVENT, handleConnectionChanged);
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATIONS_NEW_EVENT, handleLiveNotification);
      window.removeEventListener(ADMIN_NOTIFICATIONS_CONNECTION_CHANGED_EVENT, handleConnectionChanged);
    };
  }, []);

  return {
    notifications,
    filters,
    loading,
    error,
    unreadCount,
    liveConnected,
    updateFilters,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotifications,
  };
}
