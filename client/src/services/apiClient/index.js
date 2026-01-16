"use client";
import { addToast } from "@heroui/react";
import { DEFAULT_TIMEOUT, API_BASE_URL } from "./constants";
import { handleTokenRefresh } from "./auth";
import { handleHttpError } from "./errors";
import { buildRequestPayload, parseResponseBody } from "./request";

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
      const { requestHeaders, requestBody } = buildRequestPayload(
        headers,
        body,
      );

      return await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        credentials,
        headers: requestHeaders,
        body: requestBody,
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

    const data = await parseResponseBody(response);

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
