"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ADMIN_NOTIFICATION_LIVE_EVENT_TYPE,
  ADMIN_NOTIFICATIONS_CONNECTION_CHANGED_EVENT,
  ADMIN_NOTIFICATIONS_EVENT_SOURCE_ROUTE,
  ADMIN_NOTIFICATIONS_LIVE_CONNECTED_STATE_KEY,
  ADMIN_NOTIFICATIONS_NEW_EVENT,
  ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT,
} from "@/lib/adminNotifications";

function getAdminNotificationFromLiveMessage(liveMessage) {
  if (!liveMessage?.notification) return null;
  if (liveMessage.type && liveMessage.type !== ADMIN_NOTIFICATION_LIVE_EVENT_TYPE) return null;
  return liveMessage.notification;
}

function isConnectedLiveMessage(liveMessage) {
  return liveMessage?.type === "connected";
}

function publishConnectionState(isConnected) {
  window[ADMIN_NOTIFICATIONS_LIVE_CONNECTED_STATE_KEY] = isConnected;
  window.dispatchEvent(
    new CustomEvent(ADMIN_NOTIFICATIONS_CONNECTION_CHANGED_EVENT, {
      detail: { connected: isConnected },
    }),
  );
}

export function useAdminNotificationsWebsocket({ enabled = true } = {}) {
  const [connected, setConnected] = useState(false);
  const notificationListenersRef = useRef(new Set());

  const onNotification = useCallback((listener) => {
    notificationListenersRef.current.add(listener);
    return () => notificationListenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let eventSource;
    let reconnectTimeoutId;
    let shouldReconnect = true;

    const connect = () => {
      eventSource = new EventSource(ADMIN_NOTIFICATIONS_EVENT_SOURCE_ROUTE);

      eventSource.onmessage = (event) => {
        try {
          const liveMessage = JSON.parse(event.data);
          if (isConnectedLiveMessage(liveMessage)) {
            setConnected(true);
            publishConnectionState(true);
            window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT));
            return;
          }

          const notification = getAdminNotificationFromLiveMessage(liveMessage);
          if (notification) {
            notificationListenersRef.current.forEach((listener) => listener(notification));
            window.dispatchEvent(
              new CustomEvent(ADMIN_NOTIFICATIONS_NEW_EVENT, {
                detail: { notification },
              }),
            );
          }
        } catch {
          return;
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        publishConnectionState(false);
        eventSource.close();
        if (shouldReconnect) {
          reconnectTimeoutId = setTimeout(async () => {
            if (!shouldReconnect) return;
            try {
              await fetch("/api/auth/refresh", { method: "POST" });
            } catch {}
            if (!shouldReconnect) return;
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      clearTimeout(reconnectTimeoutId);
      if (eventSource) eventSource.close();
    };
  }, [enabled]);

  return { connected, onNotification };
}
