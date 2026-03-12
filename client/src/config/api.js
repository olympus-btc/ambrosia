const DEFAULT_API_URL = "http://localhost:9154";

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function getWsUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/^http/i, "ws")}/ws/payments`;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_PORT_API || "9154";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${host}:${port}/ws/payments`;
  }

  return `ws://localhost:9154/ws/payments`;
}

export function isElectronEnv() {
  return process.env.NEXT_PUBLIC_ELECTRON === "true";
}

export const API_URL = getApiUrl();
export const WS_URL = getWsUrl();
export const IS_ELECTRON = isElectronEnv();
