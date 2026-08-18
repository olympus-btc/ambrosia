"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";

import { useAdminNotifications } from "./hooks/useAdminNotifications";
import { NotificationFeed } from "./NotificationFeed";
import { NotificationsToolbar } from "./NotificationsToolbar";

export function Notifications() {
  const notificationsTranslations = useTranslations("notifications");
  const {
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
    refetch,
  } = useAdminNotifications();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={notificationsTranslations("title")}
        subtitle={notificationsTranslations("subtitle")}
      />

      <Card shadow="none" className="bg-white rounded-lg shadow-lg p-4 lg:p-8">
        <CardHeader className="flex flex-col items-start gap-4 px-0 pt-0">
          <h2 className="text-lg font-semibold text-green-900">
            {notificationsTranslations("list.title", { count: notifications.length })}
          </h2>
          <NotificationsToolbar
            filters={filters}
            liveConnected={liveConnected}
            notificationCount={notifications.length}
            unreadCount={unreadCount}
            onFiltersChange={updateFilters}
            onDeleteAllNotifications={deleteAllNotifications}
            onMarkAllRead={markAllRead}
            onRefresh={refetch}
            notificationsTranslations={notificationsTranslations}
          />
        </CardHeader>

        <CardBody className="px-0 pb-0">
          <NotificationFeed
            notifications={notifications}
            loading={loading}
            error={error}
            onDeleteNotification={deleteNotification}
            onMarkRead={markRead}
            notificationsTranslations={notificationsTranslations}
          />
        </CardBody>
      </Card>
    </div>
  );
}
