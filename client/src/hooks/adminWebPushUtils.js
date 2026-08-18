const WEB_PUSH_OPERATION_TIMEOUT_MS = 10000;
const WEB_PUSH_TIMEOUT_ERROR = "admin-web-push-timeout";
const WEB_PUSH_SERVICE_WORKER_UNAVAILABLE_ERROR = "admin-web-push-service-worker-unavailable";

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export function getSerializedSubscription(subscription) {
  const serializedSubscription = subscription.toJSON();
  return {
    endpoint: serializedSubscription.endpoint,
    keys: {
      p256dh: serializedSubscription.keys.p256dh,
      auth: serializedSubscription.keys.auth,
    },
    userAgent: navigator.userAgent,
  };
}

export async function summarizeEndpoint(endpoint) {
  const cryptoSubtle = globalThis.crypto?.subtle;
  if (!endpoint || !cryptoSubtle || typeof TextEncoder === "undefined") {
    return null;
  }

  let endpointHost = "invalid";
  try {
    endpointHost = new URL(endpoint).host;
  } catch {}

  const endpointBytes = new TextEncoder().encode(endpoint);
  const endpointHashBuffer = await cryptoSubtle.digest("SHA-256", endpointBytes);
  const endpointHash = [...new Uint8Array(endpointHashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);

  return { endpointHost, endpointHash };
}

export function hasWebPushSupport() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function withWebPushTimeout(promise) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(WEB_PUSH_TIMEOUT_ERROR)), WEB_PUSH_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export function getWebPushFailureReason(error) {
  if (error?.message === "admin-web-push-unavailable") return "vapidUnavailable";
  if (error?.message === WEB_PUSH_SERVICE_WORKER_UNAVAILABLE_ERROR) return "serviceWorkerUnavailable";
  if (error?.message === WEB_PUSH_TIMEOUT_ERROR) return "timeout";
  return "failed";
}

export async function getReadyServiceWorkerRegistration() {
  try {
    return await withWebPushTimeout(navigator.serviceWorker.ready);
  } catch (serviceWorkerReadinessError) {
    const existingRegistration = await navigator.serviceWorker.getRegistration?.();
    if (!existingRegistration) {
      throw new Error(WEB_PUSH_SERVICE_WORKER_UNAVAILABLE_ERROR);
    }
    throw serviceWorkerReadinessError;
  }
}
