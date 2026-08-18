"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ADMIN_ACTIVITY_NOTIFICATION_BADGE,
  ADMIN_ACTIVITY_NOTIFICATION_ICON,
  ADMIN_ACTIVITY_TEST_NOTIFICATION_TAG,
  ADMIN_NOTIFICATIONS_ROUTE,
  getAdminActivityNotificationCopy,
} from "@/lib/adminNotifications";
import {
  deleteAdminPushSubscription,
  getAdminPushVapidPublicKey,
  registerAdminPushSubscription,
} from "@/services/adminNotificationsService";

import {
  getReadyServiceWorkerRegistration,
  getSerializedSubscription,
  getWebPushFailureReason,
  hasWebPushSupport,
  summarizeEndpoint,
  urlBase64ToUint8Array,
  withWebPushTimeout,
} from "./adminWebPushUtils";

function getInitialWebPushPermission(enabled) {
  if (!enabled) return "unsupported";
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

export function useAdminWebPush({ enabled = true } = {}) {
  const isSupported = useMemo(() => enabled && hasWebPushSupport(), [enabled]);
  const [permission, setPermission] = useState(() => (
    getInitialWebPushPermission(enabled)
  ));
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState(null);
  const [subscriptionSummary, setSubscriptionSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshSubscription = useCallback(async () => {
    if (!isSupported) return null;
    const registration = await getReadyServiceWorkerRegistration();
    const subscription = await withWebPushTimeout(registration.pushManager.getSubscription());
    setSubscriptionEndpoint(subscription?.endpoint ?? null);
    setSubscriptionSummary(await summarizeEndpoint(subscription?.endpoint));
    return subscription;
  }, [isSupported]);

  useEffect(() => {
    if (!enabled) {
      setPermission("unsupported");
      setSubscriptionEndpoint(null);
      setSubscriptionSummary(null);
      return;
    }
    setPermission(getInitialWebPushPermission(true));
    refreshSubscription().catch(() => setSubscriptionEndpoint(null));
  }, [enabled, refreshSubscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      return { ok: false, reason: "unsupported" };
    }

    setLoading(true);
    setError(null);
    try {
      let nextPermission = Notification.permission;
      if (nextPermission === "default") {
        nextPermission = await withWebPushTimeout(Notification.requestPermission());
      }
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        return { ok: false, reason: nextPermission };
      }

      const registration = await getReadyServiceWorkerRegistration();
      const existingSubscription = await withWebPushTimeout(registration.pushManager.getSubscription());
      const vapidPublicKeyResponse = await withWebPushTimeout(getAdminPushVapidPublicKey());
      const vapidPublicKey = vapidPublicKeyResponse?.publicKey;
      if (!vapidPublicKey) {
        return { ok: false, reason: "vapidUnavailable" };
      }

      const subscription =
        existingSubscription ||
        await withWebPushTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }),
        );

      await withWebPushTimeout(registerAdminPushSubscription(getSerializedSubscription(subscription)));
      setSubscriptionEndpoint(subscription.endpoint);
      setSubscriptionSummary(await summarizeEndpoint(subscription.endpoint));
      return { ok: true, subscription };
    } catch (subscribeError) {
      setError(subscribeError);
      return {
        ok: false,
        reason: getWebPushFailureReason(subscribeError),
      };
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) {
      return { ok: true };
    }

    setLoading(true);
    setError(null);
    try {
      const registration = await getReadyServiceWorkerRegistration();
      const subscription = await withWebPushTimeout(registration.pushManager.getSubscription());
      if (!subscription) {
        setSubscriptionEndpoint(null);
        setSubscriptionSummary(null);
        return { ok: true };
      }

      await withWebPushTimeout(deleteAdminPushSubscription(subscription.endpoint));
      await withWebPushTimeout(subscription.unsubscribe());
      setSubscriptionEndpoint(null);
      setSubscriptionSummary(null);
      return { ok: true };
    } catch (unsubscribeError) {
      setError(unsubscribeError);
      return { ok: false, reason: getWebPushFailureReason(unsubscribeError) };
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const showTestNotification = useCallback(async () => {
    if (!isSupported) {
      return { ok: false, reason: "unsupported" };
    }
    if (Notification.permission !== "granted") {
      return { ok: false, reason: Notification.permission };
    }

    setLoading(true);
    setError(null);
    try {
      const registration = await getReadyServiceWorkerRegistration();
      const notificationCopy = getAdminActivityNotificationCopy(navigator.language);
      await withWebPushTimeout(
        registration.showNotification(notificationCopy.title, {
          body: notificationCopy.body,
          icon: ADMIN_ACTIVITY_NOTIFICATION_ICON,
          badge: ADMIN_ACTIVITY_NOTIFICATION_BADGE,
          tag: ADMIN_ACTIVITY_TEST_NOTIFICATION_TAG,
          data: {
            url: ADMIN_NOTIFICATIONS_ROUTE,
          },
        }),
      );
      return { ok: true };
    } catch (notificationError) {
      setError(notificationError);
      return { ok: false, reason: getWebPushFailureReason(notificationError) };
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    subscriptionEndpoint,
    subscriptionSummary,
    loading,
    error,
    subscribe,
    unsubscribe,
    showTestNotification,
    refreshSubscription,
  };
}
