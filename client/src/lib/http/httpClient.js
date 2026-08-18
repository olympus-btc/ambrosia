import { httpWrapper } from "./httpWrapper";

function dispatchAuthEvent(name) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(name));
  }
}

let refreshPromise = null;

async function refreshToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = httpWrapper("/auth/refresh", { method: "POST" }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function httpClient(endpoint, options = {}) {
  const { skipRefresh = false, skipForbiddenRedirect = false, ...httpOptions } = options;

  const AUTH_EXCLUDED_PATHS = ["/auth", "/wallet"];

  const shouldRefreshToken = (status, endpoint, skipRefresh) => {
    if (status !== 401 || skipRefresh) return false;
    return !AUTH_EXCLUDED_PATHS.some((path) => endpoint.startsWith(path));
  };

  const initialResponse = await httpWrapper(endpoint, httpOptions);

  if (shouldRefreshToken(initialResponse.status, endpoint, skipRefresh)) {
    const refreshResponse = await refreshToken();

    if (refreshResponse.status === 401) {
      dispatchAuthEvent("auth:expired");
      return initialResponse;
    }
    return await httpWrapper(endpoint, httpOptions);
  }

  if (initialResponse.status === 401 && !skipRefresh) {
    const event = endpoint.startsWith("/wallet") ? "wallet:unauthorized" : "auth:expired";
    dispatchAuthEvent(event);
  }
  if (initialResponse.status === 403 && !skipForbiddenRedirect)
    dispatchAuthEvent("auth:forbidden");

  return initialResponse;
}
