import { addToast } from "@heroui/react";
import { dispatchAuthEvent } from "./events";
import { performLogout } from "./auth";

export async function handleHttpError(
  status,
  endpoint,
  data,
  silentAuth = false,
) {
  const isAuthEndpoint = endpoint.startsWith("/auth");

  if (status === 401) {
    if (isAuthEndpoint) {
      const msg =
        typeof data === "string"
          ? data
          : data?.message || "Invalid Credentials";
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
        typeof data === "string" ? data : data?.message || "Not authorized";
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
