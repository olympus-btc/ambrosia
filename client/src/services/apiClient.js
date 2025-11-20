"use client";
import { addToast } from "@heroui/react";

const API_BASE_URL = "/api";
const DEFAULT_TIMEOUT = 30000;

let isRefreshing = false;
let refreshPromise = null;

export async function apiClient(
  endpoint,
  {
    method = "GET",
    headers = {},
    body,
    credentials = "include",
    timeout = DEFAULT_TIMEOUT,
    skipRefresh = false,
    silentAuth = false,
    notShowError = true,
  } = {},
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const makeRequest = async () => {
    try {
      const requestHeaders = { ...headers };
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
      if (body && !requestHeaders["Content-Type"] && !isFormData) {
        requestHeaders["Content-Type"] = "application/json";
      }

      return await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        credentials,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    let response = await makeRequest();

    const isAuthEndpoint = endpoint.startsWith("/auth");
    const isWalletEndpoint = endpoint.startsWith("/wallet");

    if (
      response.status === 401 &&
      !isAuthEndpoint &&
      !isWalletEndpoint &&
      !skipRefresh
    ) {
      const refreshed = await handleTokenRefresh();

      if (refreshed) {
        response = await makeRequest();
      } else {
        throw new Error("AUTH_EXPIRED");
      }
    }

    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      await handleHttpError(response.status, endpoint, data, silentAuth);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      const timeoutError = new Error("Timeout exceeded");
      timeoutError.code = "TIMEOUT";

      addToast({
        title: "Connection Error",
        description: "The request took too long",
        color: "danger",
      });

      throw timeoutError;
    }

    const isLoginEndpoint = endpoint.startsWith("/auth/login");
    const isSilentError = ["AUTH_EXPIRED", "UNAUTHORIZED", "TIMEOUT"].includes(
      error.message,
    );

    if (!isLoginEndpoint && !isSilentError && !notShowError) {
      addToast({
        title: "Error",
        description: error.message || "Connection Error",
        color: "danger",
      });
    }

    throw error;
  }
}

async function handleTokenRefresh() {
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
      signal: AbortSignal.timeout(10000),
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

async function handleHttpError(status, endpoint, data, silentAuth = false) {
  const isAuthEndpoint = endpoint.startsWith("/auth");

  // 401: No autenticado -> intentar refresh (ya hecho antes) o cerrar sesión
  if (status === 401) {
    if (isAuthEndpoint) {
      const msg =
        typeof data === "string"
          ? data
          : data?.message || "Credenciales inválidas";
      const error = new Error(msg);
      error.status = status;
      throw error;
    }

    if (typeof window !== "undefined" && endpoint.startsWith("/wallet")) {
      dispatchAuthEvent("wallet:unauthorized");
      throw new Error("UNAUTHORIZED");
    }

    if (silentAuth) {
      throw new Error("UNAUTHORIZED");
    }

    await performLogout();
    dispatchAuthEvent("auth:expired");

    addToast({
      color: "danger",
      title: "Authentication Error",
      description: "Not authenticated",
    });

    throw new Error("UNAUTHORIZED");
  }

  // 403: Prohibido (sin permisos) -> NO cerrar sesión; navegar a /unauthorized
  if (status === 403) {
    if (isAuthEndpoint) {
      const msg =
        typeof data === "string" ? data : data?.message || "No autorizado";
      const error = new Error(msg);
      error.status = status;
      throw error;
    }

    if (typeof window !== "undefined" && endpoint.startsWith("/wallet")) {
      dispatchAuthEvent("wallet:unauthorized");
      throw new Error("UNAUTHORIZED");
    }

    if (!silentAuth) {
      dispatchAuthEvent("auth:forbidden");
      addToast({
        color: "warning",
        title: "Access Denied",
        description: "Not authorized",
      });
    }

    throw new Error("UNAUTHORIZED");
  }

  const errorMsg = extractErrorMessage(data, status);
  throw new Error(errorMsg);
}

function extractErrorMessage(data, status) {
  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.error)
    return typeof data.error === "string" ? data.error : data.error.message;

  const statusMessages = {
    400: "Bad Request",
    404: "Not Found",
    500: "Internal server error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };

  return statusMessages[status] || `Error ${status}`;
}

async function performLogout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

function dispatchAuthEvent(eventName, detail = null) {
  if (typeof window !== "undefined") {
    const event = detail
      ? new CustomEvent(eventName, { detail })
      : new Event(eventName);
    window.dispatchEvent(event);
  }
}
