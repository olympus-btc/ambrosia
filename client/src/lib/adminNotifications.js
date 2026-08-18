export const ADMIN_NOTIFICATIONS_ROUTE = "/store/notifications";
export const ADMIN_NOTIFICATIONS_EVENT_SOURCE_ROUTE = "/api/ws-admin-notifications";
export const ADMIN_NOTIFICATION_CATEGORY_WALLET = "wallet";
export const ADMIN_ACTIVITY_NOTIFICATION_TAG = "admin-activity";
export const ADMIN_ACTIVITY_TEST_NOTIFICATION_TAG = "admin-activity-test";
export const ADMIN_ACTIVITY_NOTIFICATION_ICON = "/icons/512x512.png";
export const ADMIN_ACTIVITY_NOTIFICATION_BADGE = "/icons/icon-maskable-192.png";
export const ADMIN_ACTIVITY_ELECTRON_IPC = "notifications:admin-activity";
export const ADMIN_NOTIFICATIONS_NEW_EVENT = "adminNotifications:new";
export const ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT = "adminNotifications:refreshUnreadCount";
export const ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT = "adminNotifications:preferencesChanged";
export const ADMIN_NOTIFICATIONS_CONNECTION_CHANGED_EVENT = "adminNotifications:connectionChanged";
export const ADMIN_NOTIFICATION_LIVE_EVENT_TYPE = "admin_notification";
export const ADMIN_NOTIFICATIONS_LIVE_CONNECTED_STATE_KEY = "__adminNotificationsLiveConnected";

const ADMIN_ACTIVITY_NOTIFICATION_COPY = {
  en: {
    title: "Ambrosia",
    body: "Recent important activity is available. Open the feed to review user, role, and details.",
    fallbackActivityTitle: "Recent admin activity",
  },
  es: {
    title: "Ambrosia",
    body: "Hay actividad importante reciente. Abre el feed para ver usuario, rol y detalles.",
    fallbackActivityTitle: "Actividad administrativa reciente",
  },
};

export function getAdminActivityNotificationCopy(locale) {
  const normalizedLocale = typeof locale === "string" ? locale.toLowerCase() : "";
  return normalizedLocale.startsWith("es")
    ? ADMIN_ACTIVITY_NOTIFICATION_COPY.es
    : ADMIN_ACTIVITY_NOTIFICATION_COPY.en;
}

export function getElectronAdminNotificationPayload(notification, locale, notificationDisplay) {
  const notificationCopy = getAdminActivityNotificationCopy(locale);
  return {
    systemTitle: notificationCopy.title,
    systemBody: notificationCopy.body,
    fallbackActivityTitle: notificationCopy.fallbackActivityTitle,
    title: notificationDisplay?.title || notification?.title,
    body: notificationDisplay?.description || notification?.body,
    category: notification?.category,
    status: notification?.status,
  };
}

export function isWebPushActiveOnDevice(preference, webPushState) {
  return Boolean(
    preference?.pushEnabled &&
    webPushState.isSupported &&
    webPushState.permission === "granted" &&
    webPushState.subscriptionEndpoint,
  );
}

export function getWebPushStatusKey(webPushState, isPushActiveOnDevice) {
  if (!webPushState.isSupported) return "unsupported";
  if (webPushState.loading) return "saving";
  if (isPushActiveOnDevice) return "active";
  if (webPushState.permission === "denied") return "denied";
  return "permissionRequired";
}

export function getNotificationIdSet(notifications) {
  return new Set(
    notifications.map((notification) => notification.id).filter(Boolean),
  );
}
