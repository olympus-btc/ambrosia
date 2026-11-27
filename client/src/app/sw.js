import { defaultCache } from "@serwist/turbopack/worker";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

import {
  ADMIN_ACTIVITY_NOTIFICATION_BADGE,
  ADMIN_ACTIVITY_NOTIFICATION_ICON,
  ADMIN_ACTIVITY_NOTIFICATION_TAG,
  ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT,
  ADMIN_NOTIFICATIONS_ROUTE,
  getAdminActivityNotificationCopy,
} from "@/lib/adminNotifications";
import { BTC_CHECKOUT_ENDPOINT, buildBtcCheckoutPaymentStatusEndpoint } from "@/lib/btcCheckoutEndpoints";
import {
  getPendingCheckouts,
  markCheckoutCompleted,
} from "@/lib/btcCheckoutStore";
import { httpClient, parseJsonResponse } from "@/lib/http";
import {
  deleteObsoleteRuntimeCaches,
  isOfflineFallbackDocumentRequest,
  isPageDataRequest,
  isPageNavigationRequest,
  isSameOriginApiRequest,
  isSameOriginTrustRequest,
  OFFLINE_FALLBACK_ROUTE,
} from "@/lib/serviceWorkerNetworkOnlyRoutes";
import { fetchTrustRequest } from "@/lib/trustCache";

const ASSET_CACHE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_ROUTE,
        matcher: isOfflineFallbackDocumentRequest,
      },
    ],
  },
  runtimeCaching: [
    {
      matcher: isSameOriginTrustRequest,
      handler: fetchTrustRequest,
    },
    {
      matcher: isSameOriginApiRequest,
      handler: new NetworkOnly(),
    },
    {
      matcher: isPageNavigationRequest,
      handler: new NetworkOnly(),
    },
    {
      matcher: isPageDataRequest,
      handler: new NetworkOnly(),
    },
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
    ...defaultCache,
  ],
});

serwist.addEventListeners();

function readPushPayload(pushEvent) {
  try {
    return pushEvent.data?.json?.() || {};
  } catch {
    return {};
  }
}

function resolveAdminPushNotificationCopy(pushEvent) {
  const fallbackNotificationCopy = getAdminActivityNotificationCopy(self.navigator?.language);
  const pushPayload = readPushPayload(pushEvent);

  return {
    title: typeof pushPayload.title === "string" && pushPayload.title.trim()
      ? pushPayload.title
      : fallbackNotificationCopy.title,
    body: typeof pushPayload.body === "string" && pushPayload.body.trim()
      ? pushPayload.body
      : fallbackNotificationCopy.body,
  };
}

function notifyOpenClientsOfAdminPush() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((openWindowClients) => {
    openWindowClients.forEach((openWindowClient) => {
      openWindowClient.postMessage({ type: ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT });
    });
  });
}

self.addEventListener("sync", (backgroundSyncEvent) => {
  if (backgroundSyncEvent.tag === "btc-checkout") {
    backgroundSyncEvent.waitUntil(recoverPendingCheckouts());
  }
});

self.addEventListener("push", (pushEvent) => {
  const notificationCopy = resolveAdminPushNotificationCopy(pushEvent);
  pushEvent.waitUntil(
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

self.addEventListener("notificationclick", (notificationClickEvent) => {
  notificationClickEvent.notification.close();
  const notificationTargetUrl = notificationClickEvent.notification.data?.url || ADMIN_NOTIFICATIONS_ROUTE;

  notificationClickEvent.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((openWindowClients) => {
      const notificationTargetClient = openWindowClients.find(
        (openWindowClient) => openWindowClient.url.includes(notificationTargetUrl),
      );
      if (notificationTargetClient) {
        return notificationTargetClient.focus();
      }
      return self.clients.openWindow(notificationTargetUrl);
    }),
  );
});

async function recoverPendingCheckouts() {
  let pendingCheckouts;
  try {
    pendingCheckouts = await getPendingCheckouts();
  } catch {
    return;
  }

  for (const pendingCheckout of pendingCheckouts) {
    try {
      const paymentStatusResponse = await httpClient(
        buildBtcCheckoutPaymentStatusEndpoint(pendingCheckout.paymentHash),
      );
      const paymentStatusData = await parseJsonResponse(paymentStatusResponse);
      if (!paymentStatusResponse.ok) continue;

      if (paymentStatusData?.status === "completed") {
        await markCheckoutCompleted(pendingCheckout.paymentHash, paymentStatusData);
        continue;
      }

      if (paymentStatusData?.status === "paid") {
        const checkoutCompletionResponse = await httpClient(BTC_CHECKOUT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingCheckout.checkoutPayload),
        });
        const checkoutCompletionData = await parseJsonResponse(checkoutCompletionResponse);
        if (checkoutCompletionResponse.ok) {
          await markCheckoutCompleted(pendingCheckout.paymentHash, checkoutCompletionData);
        }
      }
    } catch {
      continue;
    }
  }
}

self.addEventListener("activate", (activateEvent) => {
  activateEvent.waitUntil(deleteObsoleteRuntimeCaches());
});
