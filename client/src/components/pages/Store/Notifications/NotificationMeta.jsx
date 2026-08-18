"use client";

import { formatTimestamp } from "./utils/formatTimestamp";

export function NotificationStatus({ isUnread, notificationsTranslations }) {
  return (
    <span className={isUnread ? "font-semibold text-green-800" : "font-medium text-gray-500"}>
      {notificationsTranslations(isUnread ? "statuses.unread" : "statuses.read")}
    </span>
  );
}

export function NotificationMeta({ notification, notificationDisplay, notificationsTranslations }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      <span>
        {notificationsTranslations("fields.actor")}
        {": "}
        <span className="font-medium text-gray-700">{notificationDisplay.actorLabel}</span>
      </span>
      <span>
        {notificationsTranslations("fields.role")}
        {": "}
        <span className="font-medium text-gray-700">{notificationDisplay.roleLabel}</span>
      </span>
      <span>
        {notificationsTranslations("fields.occurredAt")}
        {": "}
        <span className="font-medium text-gray-700">
          {formatTimestamp(notification.occurredAt || notification.createdAt)}
        </span>
      </span>
    </div>
  );
}
