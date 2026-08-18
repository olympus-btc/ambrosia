"use client";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { MarkReadButton } from "@/components/shared/MarkReadButton";

function NotificationMarkReadButton({ notification, onMarkRead, notificationsTranslations }) {
  if (notification.readAt) return null;

  return (
    <MarkReadButton
      onPress={() => onMarkRead(notification.id)}
      aria-label={notificationsTranslations("actions.markRead")}
    >
      {notificationsTranslations("actions.markRead")}
    </MarkReadButton>
  );
}

function DeleteNotificationButton({ notification, onDeleteNotification, notificationsTranslations }) {
  return (
    <DeleteButton
      onPress={() => onDeleteNotification(notification.id)}
      aria-label={notificationsTranslations("actions.delete")}
    >
      {notificationsTranslations("actions.delete")}
    </DeleteButton>
  );
}

export function NotificationActions({
  notification,
  onDeleteNotification,
  onMarkRead,
  notificationsTranslations,
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <NotificationMarkReadButton
        notification={notification}
        onMarkRead={onMarkRead}
        notificationsTranslations={notificationsTranslations}
      />
      <DeleteNotificationButton
        notification={notification}
        onDeleteNotification={onDeleteNotification}
        notificationsTranslations={notificationsTranslations}
      />
    </div>
  );
}
