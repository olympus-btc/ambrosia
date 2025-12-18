/**
 * Detecta si la aplicación está corriendo en Electron
 */
export function isElectron() {
  // Verificar si window.electron existe (expuesto por preload)
  if (typeof window !== 'undefined' && window.electron) {
    return true;
  }

  // Verificar variable de entorno
  if (process.env.NEXT_PUBLIC_ELECTRON === 'true') {
    return true;
  }

  return false;
}

/**
 * Obtiene la API de Electron si está disponible
 */
export function getElectronAPI() {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron;
  }
  return null;
}

/**
 * Obtiene información de la plataforma
 */
export function getPlatform() {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    return electronAPI.platform;
  }

  // Fallback para navegador
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent;
    if (userAgent.includes('Mac')) return 'darwin';
    if (userAgent.includes('Win')) return 'win32';
    if (userAgent.includes('Linux')) return 'linux';
  }

  return 'unknown';
}

/**
 * Obtiene versiones de Electron/Chrome/Node
 */
export function getVersions() {
  const electronAPI = getElectronAPI();
  if (electronAPI && electronAPI.versions) {
    return electronAPI.versions;
  }
  return null;
}

/**
 * Verifica si la plataforma es macOS
 */
export function isMac() {
  return getPlatform() === 'darwin';
}

/**
 * Verifica si la plataforma es Windows
 */
export function isWindows() {
  return getPlatform() === 'win32';
}

/**
 * Verifica si la plataforma es Linux
 */
export function isLinux() {
  return getPlatform() === 'linux';
}
