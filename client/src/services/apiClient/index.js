"use client";
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
        const authExpiredError = new Error("AUTH_EXPIRED");
        authExpiredError.code = "AUTH_EXPIRED";
        throw authExpiredError;
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
      const timeoutError = new Error("TIMEOUT");
      timeoutError.code = "TIMEOUT";

      throw timeoutError;
    }

    throw error;
  }
}
