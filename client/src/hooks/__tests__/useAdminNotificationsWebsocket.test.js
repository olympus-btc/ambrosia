import { act, renderHook } from "@testing-library/react";

import {
  ADMIN_NOTIFICATION_CATEGORY_WALLET,
  ADMIN_NOTIFICATIONS_EVENT_SOURCE_ROUTE,
  ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT,
} from "@/lib/adminNotifications";

import { useAdminNotificationsWebsocket } from "../useAdminNotificationsWebsocket";

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  static latest() {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  static reset() {
    MockEventSource.instances = [];
  }
}

describe("useAdminNotificationsWebsocket", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockEventSource.reset();
    global.EventSource = MockEventSource;
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    window.dispatchEvent = jest.fn();
    window.electron = undefined;
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "en-US",
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete global.EventSource;
    delete global.fetch;
    delete window.electron;
  });

  it("connects to admin notifications SSE bridge", () => {
    renderHook(() => useAdminNotificationsWebsocket());

    expect(MockEventSource.latest().url).toBe(ADMIN_NOTIFICATIONS_EVENT_SOURCE_ROUTE);
  });

  it("sets connected when backend confirms live connection", () => {
    const renderedAdminNotificationsWebsocketHook = renderHook(() => useAdminNotificationsWebsocket());

    act(() => {
      MockEventSource.latest().readyState = MockEventSource.OPEN;
      MockEventSource.latest().onopen?.();
    });

    expect(renderedAdminNotificationsWebsocketHook.result.current.connected).toBe(false);

    act(() => {
      MockEventSource.latest().onmessage?.({ data: JSON.stringify({ type: "connected" }) });
    });

    expect(renderedAdminNotificationsWebsocketHook.result.current.connected).toBe(true);
    expect(window.dispatchEvent).toHaveBeenCalledWith(new Event(ADMIN_NOTIFICATIONS_REFRESH_UNREAD_COUNT_EVENT));
  });

  it("notifies listeners and dispatches browser event for admin notifications", () => {
    const listener = jest.fn();
    const notification = {
      id: "notification-1",
      category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
      type: "wallet.payment.sent",
      title: "Wallet payment sent",
    };
    const renderedAdminNotificationsWebsocketHook = renderHook(() => useAdminNotificationsWebsocket());

    act(() => {
      renderedAdminNotificationsWebsocketHook.result.current.onNotification(listener);
      MockEventSource.latest().onmessage?.({
        data: JSON.stringify({ type: "admin_notification", notification }),
      });
    });

    expect(listener).toHaveBeenCalledWith(notification);
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
  });

  it("accepts backend live notifications when serializer omits default event type", () => {
    const listener = jest.fn();
    const notification = {
      id: "3078ceec-f696-43f2-9c41-407323ad1688",
      category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
      type: "wallet.payment.received",
      title: "Wallet payment received",
      body: "Wallet received 90 sats",
      actorUserName: "Phoenix webhook",
      actorRole: "system",
      status: "success",
    };
    const renderedAdminNotificationsWebsocketHook = renderHook(() => useAdminNotificationsWebsocket());

    act(() => {
      renderedAdminNotificationsWebsocketHook.result.current.onNotification(listener);
      MockEventSource.latest().onmessage?.({
        data: JSON.stringify({ notification }),
      });
    });

    expect(listener).toHaveBeenCalledWith(notification);
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
  });

  it("ignores non-admin notification typed messages", () => {
    const listener = jest.fn();
    const renderedAdminNotificationsWebsocketHook = renderHook(() => useAdminNotificationsWebsocket());

    act(() => {
      renderedAdminNotificationsWebsocketHook.result.current.onNotification(listener);
      MockEventSource.latest().onmessage?.({
        data: JSON.stringify({
          type: "connected",
          notification: { id: "notification-1" },
        }),
      });
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores connection message events", () => {
    const listener = jest.fn();
    const renderedAdminNotificationsWebsocketHook = renderHook(() => useAdminNotificationsWebsocket());

    act(() => {
      renderedAdminNotificationsWebsocketHook.result.current.onNotification(listener);
      MockEventSource.latest().onmessage?.({ data: JSON.stringify({ type: "connected" }) });
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("refreshes auth and reconnects after errors", async () => {
    renderHook(() => useAdminNotificationsWebsocket());

    act(() => {
      MockEventSource.latest().readyState = MockEventSource.OPEN;
      MockEventSource.latest().onopen?.();
      MockEventSource.latest().onerror?.();
    });

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/auth/refresh", { method: "POST" });
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it("closes the EventSource on unmount", () => {
    const { unmount } = renderHook(() => useAdminNotificationsWebsocket());
    const eventSource = MockEventSource.latest();

    unmount();

    expect(eventSource.readyState).toBe(MockEventSource.CLOSED);
  });
});
