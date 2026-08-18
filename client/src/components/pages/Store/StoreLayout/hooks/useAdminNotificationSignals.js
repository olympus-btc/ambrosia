"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAdminNotificationsWebsocket } from "@/hooks/useAdminNotificationsWebsocket";
import {
  ADMIN_ACTIVITY_ELECTRON_IPC,
  ADMIN_NOTIFICATION_CATEGORY_WALLET,
  ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT,
  ADMIN_NOTIFICATIONS_NEW_EVENT,
  ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT,
  ADMIN_NOTIFICATIONS_ROUTE,
  getElectronAdminNotificationPayload,
  getNotificationIdSet,
} from "@/lib/adminNotifications";
import {
  getAdminNotificationPreferences,
  getAdminNotifications,
} from "@/services/adminNotificationsService";

import { getAdminNotificationDisplay } from "../../Notifications/utils/notificationDisplay";
import { createNotificationsTranslator } from "../../Notifications/utils/notificationTranslations";
import { showAdminNotificationToast } from "../adminNotificationToast";

const UNREAD_NOTIFICATION_POLL_INTERVAL_MS = 10000;

function findNotificationPreference(preferences, category) {
  return preferences.find((preference) => preference.category === category);
}

function findNewUnreadNotifications(unreadNotifications, knownUnreadNotificationIds) {
  return unreadNotifications.filter(
    (notification) => notification.id && !knownUnreadNotificationIds.has(notification.id),
  );
}

function publishAdminNotification(notification) {
  window.dispatchEvent(
    new CustomEvent(ADMIN_NOTIFICATIONS_NEW_EVENT, {
      detail: { notification },
    }),
  );
}

function sendElectronAdminNotification(notification, locale) {
  if (typeof window === "undefined") return;
  const electronIpcSender = window.electron?.ipc?.send;
  if (!electronIpcSender) return;

  const notificationsTranslator = createNotificationsTranslator(locale);
  const notificationDisplay = getAdminNotificationDisplay(notification, notificationsTranslator);
  electronIpcSender(
    ADMIN_ACTIVITY_ELECTRON_IPC,
    getElectronAdminNotificationPayload(notification, locale, notificationDisplay),
  );
}

export function useAdminNotificationSignals({
  enabled,
  locale,
  pathname,
  notificationsTranslations,
}) {
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const knownUnreadNotificationIdsRef = useRef(new Set());
  const inAppToastPreferencesRef = useRef({});
  const inAppToastPreferencesLoadedRef = useRef(false);
  const { onNotification } = useAdminNotificationsWebsocket({
    enabled,
  });

  const fetchUnreadNotifications = useCallback(async () => {
    if (!enabled) {
      return [];
    }

    const unreadNotifications = await getAdminNotifications({ unreadOnly: true, limit: 100 });
    return Array.isArray(unreadNotifications) ? unreadNotifications : [];
  }, [enabled]);

  const loadInAppToastPreferences = useCallback(async () => {
    if (!enabled) return {};

    try {
      const preferences = await getAdminNotificationPreferences();
      const walletPreference = findNotificationPreference(
        Array.isArray(preferences) ? preferences : [],
        ADMIN_NOTIFICATION_CATEGORY_WALLET,
      );
      return {
        [ADMIN_NOTIFICATION_CATEGORY_WALLET]: walletPreference?.inAppEnabled !== false,
      };
    } catch {
      return {};
    }
  }, [enabled]);

  const applyUnreadNotifications = useCallback((unreadNotifications) => {
    knownUnreadNotificationIdsRef.current = getNotificationIdSet(unreadNotifications);
    setNotificationUnreadCount(unreadNotifications.length);
  }, []);

  const applyInAppToastPreferences = useCallback((loadedInAppToastPreferences) => {
    inAppToastPreferencesRef.current = loadedInAppToastPreferences;
    inAppToastPreferencesLoadedRef.current = true;
  }, []);

  const shouldShowNotificationToast = useCallback((notification) => {
    if (!inAppToastPreferencesLoadedRef.current) return false;
    const notificationCategory = notification?.category || ADMIN_NOTIFICATION_CATEGORY_WALLET;
    return inAppToastPreferencesRef.current[notificationCategory] !== false;
  }, []);

  const showToastIfAllowed = useCallback((notification) => {
    if (pathname !== ADMIN_NOTIFICATIONS_ROUTE && shouldShowNotificationToast(notification)) {
      showAdminNotificationToast(notification, notificationsTranslations);
    }
  }, [notificationsTranslations, pathname, shouldShowNotificationToast]);

  const refreshNotificationUnreadCount = useCallback(() => {
    fetchUnreadNotifications()
      .then(applyUnreadNotifications)
      .catch(() => setNotificationUnreadCount(0));
  }, [applyUnreadNotifications, fetchUnreadNotifications]);

  useEffect(() => {
    let isSubscribed = true;
    fetchUnreadNotifications()
      .then((unreadNotifications) => {
        if (!isSubscribed) return;
        applyUnreadNotifications(unreadNotifications);
      })
      .catch(() => {
        if (isSubscribed) setNotificationUnreadCount(0);
      });
    return () => {
      isSubscribed = false;
    };
  }, [applyUnreadNotifications, fetchUnreadNotifications]);

  useEffect(() => {
    if (!enabled) {
      inAppToastPreferencesLoadedRef.current = false;
      return undefined;
    }

    let isSubscribed = true;
    loadInAppToastPreferences().then((loadedInAppToastPreferences) => {
      if (!isSubscribed) return;
      applyInAppToastPreferences(loadedInAppToastPreferences);
    });
    return () => {
      isSubscribed = false;
    };
  }, [applyInAppToastPreferences, enabled, loadInAppToastPreferences]);

  useEffect(() => {
    if (!enabled) return undefined;
    const handleRefreshUnreadCount = () => {
      refreshNotificationUnreadCount();
    };
    window.addEventListener(ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT, handleRefreshUnreadCount);
    return () => window.removeEventListener(ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT, handleRefreshUnreadCount);
  }, [enabled, refreshNotificationUnreadCount]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.serviceWorker) return undefined;
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT) {
        refreshNotificationUnreadCount();
      }
    };
    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [enabled, refreshNotificationUnreadCount]);

  useEffect(() => {
    if (!enabled) return undefined;
    const handleNotificationPreferencesChanged = () => {
      loadInAppToastPreferences().then((loadedInAppToastPreferences) => {
        applyInAppToastPreferences(loadedInAppToastPreferences);
      });
    };
    window.addEventListener(ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT, handleNotificationPreferencesChanged);
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT, handleNotificationPreferencesChanged);
    };
  }, [applyInAppToastPreferences, enabled, loadInAppToastPreferences]);

  useEffect(() => onNotification((notification) => {
    if (notification?.id) {
      knownUnreadNotificationIdsRef.current.add(notification.id);
    }
    setNotificationUnreadCount((currentCount) => currentCount + 1);
    sendElectronAdminNotification(notification, locale);
    showToastIfAllowed(notification);
  }), [locale, onNotification, showToastIfAllowed]);

  useEffect(() => {
    if (!enabled) return undefined;

    const pollUnreadNotifications = () => {
      fetchUnreadNotifications()
        .then((unreadNotifications) => {
          const currentUnreadNotificationIds = getNotificationIdSet(unreadNotifications);
          const newUnreadNotifications = findNewUnreadNotifications(
            unreadNotifications,
            knownUnreadNotificationIdsRef.current,
          );

          knownUnreadNotificationIdsRef.current = currentUnreadNotificationIds;
          setNotificationUnreadCount(unreadNotifications.length);

          const newestUnreadNotification = newUnreadNotifications[0];
          if (newestUnreadNotification) {
            publishAdminNotification(newestUnreadNotification);
            sendElectronAdminNotification(newestUnreadNotification, locale);
            showToastIfAllowed(newestUnreadNotification);
          }
        })
        .catch(() => undefined);
    };

    const intervalId = window.setInterval(pollUnreadNotifications, UNREAD_NOTIFICATION_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [
    enabled,
    fetchUnreadNotifications,
    locale,
    showToastIfAllowed,
  ]);

  return { notificationUnreadCount };
}
