const DEFAULT_API_URL = "http://localhost:9154";
const DEFAULT_API_PORT = "9154";

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

function getApiPort() {
  if (process.env.NEXT_PUBLIC_PORT_API) {
    return process.env.NEXT_PUBLIC_PORT_API;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
      return apiUrl.port || DEFAULT_API_PORT;
    } catch {}
  }

  return DEFAULT_API_PORT;
}

export function getWsUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const port = getApiPort();
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${host}:${port}/ws/payments`;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/^http/i, "ws")}/ws/payments`;
  }

  return `ws://localhost:${DEFAULT_API_PORT}/ws/payments`;
}

export function isElectronEnv() {
  return process.env.NEXT_PUBLIC_ELECTRON === "true";
}

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();
export const IS_ELECTRON = isElectronEnv();
