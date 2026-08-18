import { addToast } from "@heroui/react";

import { getAdminNotificationDisplay } from "../Notifications/utils/notificationDisplay";

const FAILED_NOTIFICATION_STATUS = "failed";

export function getAdminNotificationToastColor(notification) {
  return notification?.status === FAILED_NOTIFICATION_STATUS ? "danger" : "success";
}

export function showAdminNotificationToast(notification, notificationsTranslations) {
  const notificationDisplay = getAdminNotificationDisplay(notification, notificationsTranslations);

  addToast({
    color: getAdminNotificationToastColor(notification),
    title: notificationDisplay.title || notificationsTranslations("toast.title"),
    description: notificationDisplay.description || notificationsTranslations("toast.description"),
  });
}
