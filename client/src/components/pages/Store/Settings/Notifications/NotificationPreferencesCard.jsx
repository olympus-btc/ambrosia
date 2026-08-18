"use client";

import { addToast, Button, Card, CardBody, CardHeader, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useAdminNotificationPreferences } from "@/hooks/useAdminNotificationPreferences";
import { useAdminWebPush } from "@/hooks/useAdminWebPush";
import {
  ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT,
  getWebPushStatusKey,
  isWebPushActiveOnDevice,
} from "@/lib/adminNotifications";
import { isElectron } from "@lib/isElectron";

function EndpointSummary({ endpointSummary, label }) {
  if (!endpointSummary) return null;

  return (
    <p className="break-words text-xs text-gray-500">
      {label}
      {": "}
      <span className="font-mono">
        {endpointSummary.endpointHost}
        {" · "}
        {endpointSummary.endpointHash}
      </span>
    </p>
  );
}

function showWebPushToggleErrorToast(settingsTranslations, reason) {
  const descriptionKey = reason ? `cardNotifications.pushErrors.${reason}` : "cardNotifications.pushErrors.failed";
  addToast({
    color: "danger",
    title: settingsTranslations("cardNotifications.pushErrorTitle"),
    description: settingsTranslations(descriptionKey),
  });
}

function notifyAdminNotificationPreferencesChanged() {
  window.dispatchEvent(new Event(ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT));
}

export function NotificationPreferencesCard() {
  const settingsTranslations = useTranslations("settings");
  const notificationTranslations = useTranslations("notifications");
  const {
    walletPreference,
    loading,
    savingPreference,
    error,
    updatePreference,
  } = useAdminNotificationPreferences();
  const shouldShowWebPushControls = !isElectron;
  const webPush = useAdminWebPush({ enabled: shouldShowWebPushControls });

  if (!loading && !walletPreference && !error) return null;

  const isWalletPushActiveOnDevice = isWebPushActiveOnDevice(walletPreference, webPush);
  const walletWebPushStatusKey = getWebPushStatusKey(webPush, isWalletPushActiveOnDevice);
  const disabled = loading || savingPreference;

  const handlePushPreferenceChange = async (pushEnabled) => {
    if (!walletPreference) return;

    const pushResult = pushEnabled ? await webPush.subscribe() : await webPush.unsubscribe();
    if (!pushResult.ok) {
      showWebPushToggleErrorToast(settingsTranslations, pushResult.reason);
      return;
    }

    const updatedPreference = await updatePreference({ ...walletPreference, pushEnabled });
    if (updatedPreference) notifyAdminNotificationPreferencesChanged();
  };

  const handleInAppPreferenceChange = async (inAppEnabled) => {
    if (!walletPreference) return;
    const updatedPreference = await updatePreference({ ...walletPreference, inAppEnabled });
    if (updatedPreference) notifyAdminNotificationPreferencesChanged();
  };

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("cardNotifications.title")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {settingsTranslations("cardNotifications.subtitle")}
        </p>
      </CardHeader>

      <CardBody>
        {error && (
          <p className="text-sm text-red-600">
            {settingsTranslations("cardNotifications.error")}
          </p>
        )}

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm sm:text-base font-semibold text-gray-700">
              {settingsTranslations("cardNotifications.walletTitle")}
            </p>
            {shouldShowWebPushControls && (
              <>
                <p className="text-xs sm:text-sm text-gray-500">
                  {notificationTranslations(`webPush.${walletWebPushStatusKey}`)}
                </p>
                <EndpointSummary
                  endpointSummary={webPush.subscriptionSummary}
                  label={notificationTranslations("webPush.endpoint")}
                />
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <Switch
                isSelected={Boolean(walletPreference?.inAppEnabled)}
                isDisabled={disabled || !walletPreference}
                onValueChange={handleInAppPreferenceChange}
                aria-label={settingsTranslations("cardNotifications.inApp")}
              >
                <span className="text-sm font-medium">{settingsTranslations("cardNotifications.inApp")}</span>
              </Switch>
            </div>

            {shouldShowWebPushControls && (
              <>
                <div>
                  <Switch
                    isSelected={isWalletPushActiveOnDevice}
                    isDisabled={disabled || webPush.loading || !webPush.isSupported || !walletPreference}
                    onValueChange={handlePushPreferenceChange}
                    aria-label={settingsTranslations("cardNotifications.push")}
                  >
                    <span className="text-sm font-medium">{settingsTranslations("cardNotifications.push")}</span>
                  </Switch>
                </div>

                <Button
                  color="primary"
                  className="h-8 min-w-16 px-3 rounded-small bg-green-800 sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
                  isDisabled={!isWalletPushActiveOnDevice || disabled || webPush.loading}
                  onPress={webPush.showTestNotification}
                >
                  {settingsTranslations("cardNotifications.testPush")}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
