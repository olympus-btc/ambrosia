import { TextEncoder } from "node:util";

import {
  getSerializedSubscription,
  getWebPushFailureReason,
  hasWebPushSupport,
  summarizeEndpoint,
  urlBase64ToUint8Array,
  withWebPushTimeout,
} from "../adminWebPushUtils";

describe("adminWebPushUtils", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete window.Notification;
    delete window.PushManager;
    delete navigator.serviceWorker;
    delete globalThis.crypto;
    delete globalThis.TextEncoder;
  });

  it("converts a URL-safe VAPID public key to bytes", () => {
    window.atob = jest.fn(() => "\u0001\u0002\u0003");

    expect(urlBase64ToUint8Array("AQID")).toEqual(new Uint8Array([1, 2, 3]));
    expect(window.atob).toHaveBeenCalledWith("AQID");
  });

  it("serializes a browser push subscription without extra fields", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "jest-agent",
    });
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/subscription",
        expirationTime: null,
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      }),
    };

    expect(getSerializedSubscription(subscription)).toEqual({
      endpoint: "https://push.example/subscription",
      keys: {
        p256dh: "p256dh-key",
        auth: "auth-key",
      },
      userAgent: "jest-agent",
    });
  });

  it("summarizes endpoint host and short hash without returning the full endpoint", async () => {
    Object.defineProperty(globalThis, "TextEncoder", {
      configurable: true,
      value: TextEncoder,
    });
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        subtle: {
          digest: jest.fn(async () => new Uint8Array([0xab, 0xcd, 0xef, 0x12, 0x34, 0x56]).buffer),
        },
      },
    });

    await expect(summarizeEndpoint("https://push.example/secret-subscription")).resolves.toEqual({
      endpointHost: "push.example",
      endpointHash: "abcdef123456",
    });
  });

  it("reports Web Push support only when all browser APIs exist", () => {
    delete window.Notification;
    delete window.PushManager;
    delete navigator.serviceWorker;

    expect(hasWebPushSupport()).toBe(false);

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });

    expect(hasWebPushSupport()).toBe(true);
  });

  it("maps Web Push errors to user-facing failure reasons", () => {
    expect(getWebPushFailureReason(new Error("admin-web-push-unavailable"))).toBe("vapidUnavailable");
    expect(getWebPushFailureReason(new Error("admin-web-push-service-worker-unavailable"))).toBe(
      "serviceWorkerUnavailable",
    );
    expect(getWebPushFailureReason(new Error("admin-web-push-timeout"))).toBe("timeout");
    expect(getWebPushFailureReason(new Error("unexpected"))).toBe("failed");
  });

  it("rejects long-running operations with a timeout error", async () => {
    jest.useFakeTimers();
    const operationPromise = withWebPushTimeout(new Promise(() => {}));

    jest.advanceTimersByTime(10000);

    await expect(operationPromise).rejects.toThrow("admin-web-push-timeout");
  });
});
