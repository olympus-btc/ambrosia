import { httpWrapper } from "./httpWrapper";

export async function httpClient(endpoint, options = {}) {
  const { skipRefresh = false, ...httpOptions } = options;

  const AUTH_EXCLUDED_PATHS = ["/auth", "/wallet"];

  const shouldRefreshToken = (status, endpoint, skipRefresh) => {
    if (status !== 401 || skipRefresh) return false;
    return !AUTH_EXCLUDED_PATHS.some((path) => endpoint.startsWith(path));
  };

  const response = await httpWrapper(endpoint, httpOptions);

  if (shouldRefreshToken(response.status, endpoint, skipRefresh)) {
    const refreshResponse = await httpWrapper("/auth/refresh", {
      method: "POST",
    });

    if (refreshResponse.status === 401) {
      window.dispatchEvent(new Event("auth:expired"));
      return response;
    }
    return await httpWrapper(endpoint, httpOptions);
  }

  if (response.status === 401 && !skipRefresh) window.dispatchEvent(new Event("auth:expired"));
  if (response.status === 403 && !skipRefresh)
    window.dispatchEvent(new Event("auth:forbidden"));

  return response;
}
