import { defaultCache } from "@serwist/turbopack/worker";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

import {
  ADMIN_ACTIVITY_NOTIFICATION_BADGE,
  ADMIN_ACTIVITY_NOTIFICATION_ICON,
  ADMIN_ACTIVITY_NOTIFICATION_TAG,
  ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT,
  ADMIN_NOTIFICATIONS_ROUTE,
  getAdminActivityNotificationCopy,
} from "@/lib/adminNotifications";
import {
  getPendingCheckouts,
  markCheckoutCompleted,
} from "@/lib/btcCheckoutStore";
import { httpClient, parseJsonResponse } from "@/lib/http";

const ASSET_CACHE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const API_CACHE_MAX_AGE_SECONDS = 5 * 60;
const NETWORK_TIMEOUT_SECONDS = 5;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
  runtimeCaching: [
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: ASSET_CACHE_MAX_AGE_SECONDS,
          }),
        ],
      }),
    },
    {
      matcher: /^\/api\//,
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: API_CACHE_MAX_AGE_SECONDS,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

function readPushPayload(event) {
  try {
    return event.data?.json?.() || {};
  } catch {
    return {};
  }
}

function resolveAdminPushNotificationCopy(event) {
  const fallbackCopy = getAdminActivityNotificationCopy(self.navigator?.language);
  const payload = readPushPayload(event);

  return {
    title: typeof payload.title === "string" && payload.title.trim() ? payload.title : fallbackCopy.title,
    body: typeof payload.body === "string" && payload.body.trim() ? payload.body : fallbackCopy.body,
  };
}

function notifyOpenClientsOfAdminPush() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({ type: ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT });
    });
  });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "btc-checkout") {
    event.waitUntil(recoverPendingCheckouts());
  }
});

self.addEventListener("push", (event) => {
  const notificationCopy = resolveAdminPushNotificationCopy(event);
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationCopy.title, {
        body: notificationCopy.body,
        icon: ADMIN_ACTIVITY_NOTIFICATION_ICON,
        badge: ADMIN_ACTIVITY_NOTIFICATION_BADGE,
        tag: ADMIN_ACTIVITY_NOTIFICATION_TAG,
        renotify: true,
        data: {
          url: ADMIN_NOTIFICATIONS_ROUTE,
        },
      }),
      notifyOpenClientsOfAdminPush(),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || ADMIN_NOTIFICATIONS_ROUTE;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => client.url.includes(targetUrl));
      if (existingClient) {
        return existingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

async function recoverPendingCheckouts() {
  let pending;
  try {
    pending = await getPendingCheckouts();
  } catch {
    return;
  }

  for (const entry of pending) {
    try {
      const statusResponse = await httpClient(
        `store/orders/payment-status/${entry.paymentHash}`,
      );
      const statusData = await parseJsonResponse(statusResponse);
      if (!statusResponse.ok) continue;

      if (statusData?.status === "completed") {
        await markCheckoutCompleted(entry.paymentHash, statusData);
        continue;
      }

      if (statusData?.status === "paid") {
        const checkoutResponse = await httpClient("store/orders/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry.checkoutPayload),
        });
        const checkoutData = await parseJsonResponse(checkoutResponse);
        if (checkoutResponse.ok) {
          await markCheckoutCompleted(entry.paymentHash, checkoutData);
        }
      }
    } catch {
      continue;
    }
  }
}

self.addEventListener("install", (event) => {
  const requestPromises = Promise.all(
    ["/"].map((entry) => serwist.handleRequest({ request: new Request(entry), event }),
    ),
  );
  event.waitUntil(requestPromises);
});
