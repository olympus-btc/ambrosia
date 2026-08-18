import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getAdminNotifications(filters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.offset) queryParams.set("offset", String(filters.offset));
  if (filters.unreadOnly) queryParams.set("unreadOnly", "true");
  if (filters.category) queryParams.set("category", filters.category);

  const queryString = queryParams.toString();
  const notificationsResponse = await httpClient(`/admin/notifications${queryString ? `?${queryString}` : ""}`);
  return await parseJsonResponse(notificationsResponse, []);
}

export async function markAdminNotificationRead(notificationId) {
  const readNotificationResponse = await httpClient(`/admin/notifications/${notificationId}/read`, {
    method: "POST",
  });
  return await parseJsonResponse(readNotificationResponse, null);
}

export async function markAllAdminNotificationsRead(category) {
  const queryString = category ? `?category=${encodeURIComponent(category)}` : "";
  const readAllNotificationsResponse = await httpClient(`/admin/notifications/read-all${queryString}`, {
    method: "POST",
  });
  return await parseJsonResponse(readAllNotificationsResponse, { updated: 0 });
}

export async function deleteAdminNotification(notificationId) {
  const deleteNotificationResponse = await httpClient(`/admin/notifications/${notificationId}`, {
    method: "DELETE",
  });
  return await parseJsonResponse(deleteNotificationResponse, null);
}

export async function deleteAllAdminNotifications(category) {
  const queryString = category ? `?category=${encodeURIComponent(category)}` : "";
  const deleteAllNotificationsResponse = await httpClient(`/admin/notifications${queryString}`, {
    method: "DELETE",
  });
  return await parseJsonResponse(deleteAllNotificationsResponse, { deleted: 0 });
}

export async function getAdminNotificationPreferences() {
  const preferencesResponse = await httpClient("/admin/notification-preferences");
  return await parseJsonResponse(preferencesResponse, []);
}

export async function updateAdminNotificationPreference(preference) {
  const preferenceRequest = {
    category: preference.category,
    inAppEnabled: preference.inAppEnabled,
    pushEnabled: preference.pushEnabled,
  };
  const updatePreferenceResponse = await httpClient("/admin/notification-preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferenceRequest),
  });
  return await parseJsonResponse(updatePreferenceResponse, null);
}

export async function getAdminPushVapidPublicKey() {
  const vapidPublicKeyResponse = await httpClient("/admin/push/vapid-public-key");
  if (!vapidPublicKeyResponse?.ok) {
    throw new Error("admin-web-push-unavailable");
  }
  return await parseJsonResponse(vapidPublicKeyResponse, null);
}

export async function registerAdminPushSubscription(subscription) {
  const registerSubscriptionResponse = await httpClient("/admin/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  return await parseJsonResponse(registerSubscriptionResponse, null);
}

export async function deleteAdminPushSubscription(endpoint) {
  const queryString = `?endpoint=${encodeURIComponent(endpoint)}`;
  const deleteSubscriptionResponse = await httpClient(`/admin/push/subscriptions${queryString}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  return await parseJsonResponse(deleteSubscriptionResponse, null);
}
