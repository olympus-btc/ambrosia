import { reportClientError } from "@/lib/logging/reportClientError";
import { CLIENT_LOG_REPORTS_ENDPOINT } from "@/lib/logs";

import { httpWrapper } from "./httpWrapper";

const FIRST_SERVER_ERROR_STATUS = 500;

export function dispatchAuthEvent(authEventName) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(authEventName));
  }
}

let refreshPromise = null;

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = httpWrapper("/auth/refresh", { method: "POST" }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function reportServerErrorResponse(endpoint, httpOptions, httpResponse) {
  if (!httpResponse || httpResponse.status < FIRST_SERVER_ERROR_STATUS) return;
  const endpointPath = endpoint.split("?")[0];
  if (endpointPath.startsWith(CLIENT_LOG_REPORTS_ENDPOINT)) return;
  const requestMethod = (httpOptions.method || "GET").toUpperCase();
  reportClientError({
    message: `HTTP ${httpResponse.status} ${requestMethod} ${endpointPath}`,
    context: { type: "http", status: String(httpResponse.status) },
  });
}

async function sendAuthenticatedRequest(endpoint, { skipRefresh, skipForbiddenRedirect, httpOptions }) {
  const AUTH_EXCLUDED_PATHS = ["/auth", "/wallet", "/backup"];

  const shouldRefreshToken = (responseStatus, requestedEndpoint, refreshSkipped) => {
    if (responseStatus !== 401 || refreshSkipped) return false;
    return !AUTH_EXCLUDED_PATHS.some((authExcludedPath) => requestedEndpoint.startsWith(authExcludedPath));
  };

  const initialResponse = await httpWrapper(endpoint, httpOptions);

  if (shouldRefreshToken(initialResponse.status, endpoint, skipRefresh)) {
    const refreshResponse = await refreshAccessToken();

    if (!refreshResponse.ok) {
      dispatchAuthEvent("auth:expired");
      return initialResponse;
    }
    return await httpWrapper(endpoint, httpOptions);
  }

  if (initialResponse.status === 401 && !skipRefresh) {
    const unauthorizedEventName = endpoint.startsWith("/wallet") || endpoint.startsWith("/backup") ? "wallet:unauthorized" : "auth:expired";
    dispatchAuthEvent(unauthorizedEventName);
  }
  if (initialResponse.status === 403 && !skipForbiddenRedirect)
    dispatchAuthEvent("auth:forbidden");

  return initialResponse;
}

export async function httpClient(endpoint, httpClientOptions = {}) {
  const { skipRefresh = false, skipForbiddenRedirect = false, ...httpOptions } = httpClientOptions;
  const authenticatedResponse = await sendAuthenticatedRequest(endpoint, { skipRefresh, skipForbiddenRedirect, httpOptions });
  reportServerErrorResponse(endpoint, httpOptions, authenticatedResponse);
  return authenticatedResponse;
}
