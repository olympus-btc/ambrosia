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
      throw createApiError({
        status,
        code: data?.code || status,
        data,
      });
    }

    if (typeof window !== "undefined" && endpoint.startsWith("/wallet")) {
      dispatchAuthEvent("wallet:unauthorized");
      throw createApiError({
        status,
        code: data?.code || status,
        data,
      });
    }

    if (silentAuth) {
      throw createApiError({
        status,
        code: data?.code || status,
        data,
      });
    }

    await performLogout();
    dispatchAuthEvent("auth:expired");
    throw createApiError({
      status,
      code: data?.code || status,
      data,
    });
  }

  if (status === 403) {
    if (isAuthEndpoint) {
      throw createApiError({
        status,
        code: data?.code || status,
        data,
      });
    }

    if (typeof window !== "undefined" && endpoint.startsWith("/wallet")) {
      dispatchAuthEvent("wallet:unauthorized");
      throw createApiError({
        status,
        code: data?.code || status,
        data,
      });
    }

    if (!silentAuth) {
      dispatchAuthEvent("auth:forbidden");
    }

    throw createApiError({
      status,
      code: data?.code || status,
      data,
    });
  }

  throw createApiError({
    status,
    code: data?.code || status,
    data,
  });
}

function createApiError({ status, code, data }) {
  const resolvedCode = code ?? status;
  const errorMessage = String(resolvedCode);
  const error = new Error(errorMessage);
  error.status = status ?? null;
  error.code = resolvedCode;
  error.data = data;
  return error;
}
