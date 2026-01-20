/**
 * Detects if the application is running in Electron
 */
export function isElectron() {
  // Check if window.electron exists (exposed by preload)
  if (typeof window !== "undefined" && window.electron) {
    return true;
  }

  // Check environment variable
  if (process.env.NEXT_PUBLIC_ELECTRON === "true") {
    return true;
  }

  return false;
}

/**
 * Gets the Electron API if available
 */
export function getElectronAPI() {
  if (typeof window !== "undefined" && window.electron) {
    return window.electron;
  }
  return null;
}

/**
 * Gets platform information
 */
export function getPlatform() {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    return electronAPI.platform;
  }

  // Browser fallback
  if (typeof window !== "undefined") {
    const userAgent = window.navigator.userAgent;
    if (userAgent.includes("Mac")) return "darwin";
    if (userAgent.includes("Win")) return "win32";
    if (userAgent.includes("Linux")) return "linux";
  }

  return "unknown";
}

/**
 * Gets Electron/Chrome/Node versions
 */
export function getVersions() {
  const electronAPI = getElectronAPI();
  if (electronAPI && electronAPI.versions) {
    return electronAPI.versions;
  }
  return null;
}

/**
 * Checks if the platform is macOS
 */
export function isMac() {
  return getPlatform() === "darwin";
}

/**
 * Checks if the platform is Windows
 */
export function isWindows() {
  return getPlatform() === "win32";
}

/**
 * Checks if the platform is Linux
 */
export function isLinux() {
  return getPlatform() === "linux";
}
