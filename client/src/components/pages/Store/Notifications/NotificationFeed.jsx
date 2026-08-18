"use client";

import { NotificationsMobileList } from "./NotificationsMobileList";
import { NotificationsTable } from "./NotificationsTable";

export function NotificationFeed({
  notifications,
  loading,
  error,
  onDeleteNotification,
  onMarkRead,
  notificationsTranslations,
}) {
  if (error) {
    return <p className="text-sm text-red-600">{notificationsTranslations("statuses.error")}</p>;
  }

  if (loading) {
    return <p className="text-sm text-gray-600">{notificationsTranslations("statuses.loading")}</p>;
  }

  if (notifications.length === 0) {
    return (
      <div className="py-10 text-center">
        <h2 className="text-lg font-semibold text-green-900">{notificationsTranslations("empty.title")}</h2>
        <p className="mt-1 text-sm text-gray-500">{notificationsTranslations("empty.description")}</p>
      </div>
    );
  }

  return (
    <>
      <NotificationsMobileList
        notifications={notifications}
        onDeleteNotification={onDeleteNotification}
        onMarkRead={onMarkRead}
        notificationsTranslations={notificationsTranslations}
      />
      <NotificationsTable
        notifications={notifications}
        onDeleteNotification={onDeleteNotification}
        onMarkRead={onMarkRead}
        notificationsTranslations={notificationsTranslations}
      />
    </>
  );
}
