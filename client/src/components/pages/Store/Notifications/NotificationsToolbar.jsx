"use client";

import { Switch, Tab, Tabs } from "@heroui/react";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { MarkReadButton } from "@/components/shared/MarkReadButton";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { ADMIN_NOTIFICATION_CATEGORY_WALLET } from "@/lib/adminNotifications";

export function NotificationsToolbar({
  filters,
  liveConnected,
  unreadCount,
  notificationCount,
  onFiltersChange,
  onDeleteAllNotifications,
  onMarkAllRead,
  onRefresh,
  notificationsTranslations,
}) {
  return (
    <div className="flex w-full flex-col gap-4 border-b border-gray-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2">
        <Tabs
          selectedKey={filters.category || "all"}
          onSelectionChange={(selectedCategory) => (
            onFiltersChange({ category: selectedCategory === "all" ? null : selectedCategory })
          )}
          aria-label={notificationsTranslations("title")}
          variant="underlined"
          classNames={{
            tabList: "gap-4 rounded-none p-0",
            cursor: "bg-forest",
            tab: "h-10 px-0",
            tabContent: "group-data-[selected=true]:text-forest text-gray-500 text-sm font-medium",
          }}
        >
          <Tab key={ADMIN_NOTIFICATION_CATEGORY_WALLET} title={notificationsTranslations("filters.wallet")} />
          <Tab key="all" title={notificationsTranslations("filters.all")} />
        </Tabs>
        <span className={liveConnected ? "text-xs text-green-700" : "text-xs text-amber-600"}>
          {notificationsTranslations(liveConnected ? "live" : "offline")}
        </span>
      </div>

      <div className="flex w-full flex-col gap-3 lg:ml-auto lg:w-auto lg:flex-row lg:items-center lg:justify-end">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 lg:bg-transparent lg:p-0">
          <Switch
            size="sm"
            isSelected={filters.unreadOnly}
            onValueChange={(unreadOnly) => onFiltersChange({ unreadOnly })}
          >
            <span className="text-sm font-medium">{notificationsTranslations("filters.unreadOnly")}</span>
          </Switch>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:w-auto lg:items-center lg:justify-end lg:gap-3">
          <RefreshButton
            className="w-full justify-center lg:w-auto"
            onPress={() => onRefresh()}
            showLabelOnMobile
            aria-label={notificationsTranslations("actions.refresh")}
          >
            {notificationsTranslations("actions.refresh")}
          </RefreshButton>
          <MarkReadButton
            className="w-full justify-center lg:w-auto"
            isDisabled={unreadCount === 0}
            onPress={onMarkAllRead}
            showLabelOnMobile
            aria-label={notificationsTranslations("actions.markAllRead")}
          >
            {notificationsTranslations("actions.markAllRead")}
          </MarkReadButton>
          <DeleteButton
            className="w-full justify-center lg:w-auto"
            isDisabled={notificationCount === 0}
            onPress={onDeleteAllNotifications}
            showLabelOnMobile
            aria-label={notificationsTranslations("actions.deleteAll")}
          >
            {notificationsTranslations("actions.deleteAll")}
          </DeleteButton>
        </div>
      </div>
    </div>
  );
}
