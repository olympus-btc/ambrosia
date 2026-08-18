"use client";

import { NotificationActions } from "./NotificationActions";
import { NotificationMeta, NotificationStatus } from "./NotificationMeta";
import { getAdminNotificationDisplay } from "./utils/notificationDisplay";

function NotificationMobileCard({
  notification,
  onDeleteNotification,
  onMarkRead,
  notificationsTranslations,
}) {
  const isUnread = !notification.readAt;
  const notificationDisplay = getAdminNotificationDisplay(notification, notificationsTranslations);

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <NotificationStatus isUnread={isUnread} notificationsTranslations={notificationsTranslations} />
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-600">{notificationDisplay.categoryLabel}</span>
            {notificationDisplay.amountLabel && (
              <>
                <span className="text-gray-400">/</span>
                <span className="font-medium text-green-800">{notificationDisplay.amountLabel}</span>
              </>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold text-green-900">{notificationDisplay.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{notificationDisplay.description}</p>
        </div>
      </div>

      <NotificationMeta
        notification={notification}
        notificationDisplay={notificationDisplay}
        notificationsTranslations={notificationsTranslations}
      />

      <div className="mt-4 flex justify-end">
        <NotificationActions
          notification={notification}
          onDeleteNotification={onDeleteNotification}
          onMarkRead={onMarkRead}
          notificationsTranslations={notificationsTranslations}
        />
      </div>
    </article>
  );
}

export function NotificationsMobileList({
  notifications,
  onDeleteNotification,
  onMarkRead,
  notificationsTranslations,
}) {
  return (
    <div className="space-y-3 pb-24 md:hidden">
      {notifications.map((notification) => (
        <NotificationMobileCard
          key={notification.id}
          notification={notification}
          onDeleteNotification={onDeleteNotification}
          onMarkRead={onMarkRead}
          notificationsTranslations={notificationsTranslations}
        />
      ))}
    </div>
  );
}
