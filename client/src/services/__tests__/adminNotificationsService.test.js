jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

import { httpClient, parseJsonResponse } from "@/lib/http";

import {
  deleteAdminNotification,
  deleteAdminPushSubscription,
  deleteAllAdminNotifications,
  getAdminNotificationPreferences,
  getAdminNotifications,
  getAdminPushVapidPublicKey,
  registerAdminPushSubscription,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  updateAdminNotificationPreference,
} from "../adminNotificationsService";

describe("adminNotificationsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValue([]);
  });

  it("loads admin notifications with supported filters", async () => {
    await getAdminNotifications({ category: "wallet", unreadOnly: true, limit: 25, offset: 50 });

    expect(httpClient).toHaveBeenCalledWith("/admin/notifications?limit=25&offset=50&unreadOnly=true&category=wallet");
    expect(parseJsonResponse).toHaveBeenCalledWith({ ok: true }, []);
  });

  it("marks one notification as read", async () => {
    parseJsonResponse.mockResolvedValueOnce({ read: true });

    await markAdminNotificationRead("notification-1");

    expect(httpClient).toHaveBeenCalledWith("/admin/notifications/notification-1/read", { method: "POST" });
  });

  it("marks all notifications as read by category", async () => {
    parseJsonResponse.mockResolvedValueOnce({ updated: 2 });

    await markAllAdminNotificationsRead("wallet");

    expect(httpClient).toHaveBeenCalledWith("/admin/notifications/read-all?category=wallet", { method: "POST" });
    expect(parseJsonResponse).toHaveBeenCalledWith({ ok: true }, { updated: 0 });
  });

  it("deletes one notification for the current admin", async () => {
    parseJsonResponse.mockResolvedValueOnce({ deleted: true });

    await deleteAdminNotification("notification-1");

    expect(httpClient).toHaveBeenCalledWith("/admin/notifications/notification-1", { method: "DELETE" });
  });

  it("deletes all notifications by category for the current admin", async () => {
    parseJsonResponse.mockResolvedValueOnce({ deleted: 2 });

    await deleteAllAdminNotifications("wallet");

    expect(httpClient).toHaveBeenCalledWith("/admin/notifications?category=wallet", { method: "DELETE" });
    expect(parseJsonResponse).toHaveBeenCalledWith({ ok: true }, { deleted: 0 });
  });

  it("loads and updates preferences", async () => {
    await getAdminNotificationPreferences();
    await updateAdminNotificationPreference({
      adminUserId: "admin-1",
      category: "wallet",
      inAppEnabled: true,
      pushEnabled: false,
      createdAt: "2026-07-16T00:00:00Z",
      updatedAt: "2026-07-16T00:00:00Z",
    });

    expect(httpClient).toHaveBeenNthCalledWith(1, "/admin/notification-preferences");
    expect(httpClient).toHaveBeenNthCalledWith(2, "/admin/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "wallet", inAppEnabled: true, pushEnabled: false }),
    });
  });

  it("loads VAPID public key and manages push subscriptions", async () => {
    await getAdminPushVapidPublicKey();
    await registerAdminPushSubscription({
      endpoint: "https://push.example/sub",
      keys: { p256dh: "key", auth: "auth" },
      userAgent: "agent",
    });
    await deleteAdminPushSubscription("https://push.example/sub");

    expect(httpClient).toHaveBeenNthCalledWith(1, "/admin/push/vapid-public-key");
    expect(httpClient).toHaveBeenNthCalledWith(2, "/admin/push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://push.example/sub",
        keys: { p256dh: "key", auth: "auth" },
        userAgent: "agent",
      }),
    });
    expect(httpClient).toHaveBeenNthCalledWith(3, "/admin/push/subscriptions?endpoint=https%3A%2F%2Fpush.example%2Fsub", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "https://push.example/sub" }),
    });
  });
});
