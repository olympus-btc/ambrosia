"use client";

import { NotificationActions } from "./NotificationActions";
import { NotificationStatus } from "./NotificationMeta";
import { formatTimestamp } from "./utils/formatTimestamp";
import { getAdminNotificationDisplay } from "./utils/notificationDisplay";

function NotificationTableRow({
  notification,
  onDeleteNotification,
  onMarkRead,
  notificationsTranslations,
}) {
  const isUnread = !notification.readAt;
  const notificationDisplay = getAdminNotificationDisplay(notification, notificationsTranslations);

  return (
    <tr className={isUnread ? "bg-green-50/70" : "bg-white"}>
      <td className="px-4 py-4 align-top">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <NotificationStatus isUnread={isUnread} notificationsTranslations={notificationsTranslations} />
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-600">{notificationDisplay.categoryLabel}</span>
            {notificationDisplay.statusLabel && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{notificationDisplay.statusLabel}</span>
              </>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-green-900">{notificationDisplay.title}</h3>
          <p className="mt-1 max-w-xl text-sm text-gray-600">{notificationDisplay.description}</p>
        </div>
      </td>
      <td className="px-4 py-4 align-top text-sm text-gray-700">
        <div className="max-w-44 truncate font-medium">{notificationDisplay.actorLabel}</div>
        <div className="mt-1 text-xs text-gray-500">{notificationDisplay.roleLabel}</div>
      </td>
      <td className="px-4 py-4 align-top text-sm text-gray-700">
        {notificationDisplay.amountLabel || "---"}
      </td>
      <td className="px-4 py-4 align-top text-sm text-gray-700">
        {formatTimestamp(notification.occurredAt || notification.createdAt)}
      </td>
      <td className="px-4 py-4 align-top text-right">
        <NotificationActions
          notification={notification}
          onDeleteNotification={onDeleteNotification}
          onMarkRead={onMarkRead}
          notificationsTranslations={notificationsTranslations}
        />
      </td>
    </tr>
  );
}

export function NotificationsTable({
  notifications,
  onDeleteNotification,
  onMarkRead,
  notificationsTranslations,
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[760px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase text-gray-500">
            <th className="border-b border-gray-200 px-4 py-3">{notificationsTranslations("table.notification")}</th>
            <th className="border-b border-gray-200 px-4 py-3">{notificationsTranslations("fields.actor")}</th>
            <th className="border-b border-gray-200 px-4 py-3">{notificationsTranslations("table.amount")}</th>
            <th className="border-b border-gray-200 px-4 py-3">{notificationsTranslations("fields.occurredAt")}</th>
            <th className="border-b border-gray-200 px-4 py-3 text-right">{notificationsTranslations("table.action")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {notifications.map((notification) => (
            <NotificationTableRow
              key={notification.id}
              notification={notification}
              onDeleteNotification={onDeleteNotification}
              onMarkRead={onMarkRead}
              notificationsTranslations={notificationsTranslations}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
