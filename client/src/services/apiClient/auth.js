import { API_BASE_URL, LOGOUT_TIMEOUT, REFRESH_TIMEOUT } from "./constants";
import { dispatchAuthEvent } from "./events";

let isRefreshing = false;
let refreshPromise = null;

export async function handleTokenRefresh() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = performTokenRefresh();

  try {
    return await refreshPromise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

async function performTokenRefresh() {
  try {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT),
    });

    if (!refreshRes.ok) {
      await performLogout();
      dispatchAuthEvent("auth:expired");

      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function performLogout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(LOGOUT_TIMEOUT),
    });
  } catch {}
}
