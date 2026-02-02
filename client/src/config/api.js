const DEFAULT_API_URL = "http://127.0.0.1:9154";

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function getWsUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  const apiUrl = getApiUrl();
  return `${apiUrl.replace(/^http/i, "ws")}/ws/payments`;
}

export function isElectronEnv() {
  return process.env.NEXT_PUBLIC_ELECTRON === "true";
}

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();
export const IS_ELECTRON = isElectronEnv();
