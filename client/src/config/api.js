const DEFAULT_API_URL = "http://localhost:9154";

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function isElectronEnv() {
  return process.env.NEXT_PUBLIC_ELECTRON === "true";
}

export const API_URL = getApiUrl();
export const IS_ELECTRON = isElectronEnv();
