import { createRequire } from 'module';
import path from 'path';
import { URL } from 'url';

import AutoUpdater from './services/AutoUpdater.js';
import { configurationBootstrap } from './services/ConfigurationBootstrap.js';
import ServiceManager from './services/ServiceManager.js';
import { unlockPasswordStore } from './services/UnlockPasswordStore.js';
import { STARTUP } from './utils/constants.js';
import { logger } from './utils/logger.js';
import { getDataDirectory, getLogsDirectory, getPhoenixDataDirectory } from './utils/resourcePaths.js';

const require = createRequire(import.meta.url);
const { app, BrowserWindow, Menu, Notification, dialog, shell, ipcMain } = require('electron');

const gotTheLock = app.requestSingleInstanceLock();
app.setName('Ambrosia');

if (!gotTheLock) {
  logger.log('[Electron] Another instance is already running. Exiting...');
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    logger.log('[Electron] Second instance detected, focusing existing window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let splashWindow = null;
let serviceManager = null;
let autoUpdaterService = null;
let updateMenuItem = null;

const ADMIN_NOTIFICATIONS_ROUTE = '/store/notifications';
const ADMIN_ACTIVITY_NOTIFICATION_CHANNEL = 'notifications:admin-activity';
const MAX_NOTIFICATION_TEXT_LENGTH = 160;

function updateMenuItemState({ label, enabled, click }) {
  if (!updateMenuItem) return;
  updateMenuItem.label = label;
  updateMenuItem.enabled = enabled;
  if (click) {
    updateMenuItem.click = click;
  } else {
    updateMenuItem.click = () => {
      if (autoUpdaterService) {
        autoUpdaterService.checkForUpdatesManual();
      }
    };
  }
}

function normalizeNotificationText(candidateText, fallbackText) {
  if (typeof candidateText !== 'string') return fallbackText;
  const trimmedText = candidateText.trim();
  if (!trimmedText) return fallbackText;
  return trimmedText.slice(0, MAX_NOTIFICATION_TEXT_LENGTH);
}

function getAdminNotificationsUrl() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      return new URL(ADMIN_NOTIFICATIONS_ROUTE, mainWindow.webContents.getURL()).toString();
    } catch {
      logger.log('[Electron] Could not resolve current window URL for admin notifications');
    }
  }

  const nextJsPort = serviceManager?.getPorts?.().nextjs;
  return nextJsPort ? `http://localhost:${nextJsPort}${ADMIN_NOTIFICATIONS_ROUTE}` : null;
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

function openAdminNotificationsFeed() {
  const adminNotificationsUrl = getAdminNotificationsUrl();
  focusMainWindow();
  if (adminNotificationsUrl && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(adminNotificationsUrl);
  }
}

function showAdminActivityNotification(notificationPayload = {}) {
  if (!Notification.isSupported()) {
    logger.log('[Electron] Native notifications are not supported on this platform');
    return;
  }

  const notificationTitle = normalizeNotificationText(
    notificationPayload.systemTitle,
    'Ambrosia',
  );
  const notificationBody = normalizeNotificationText(
    notificationPayload.body,
    notificationPayload.title ||
      notificationPayload.fallbackActivityTitle ||
      notificationPayload.systemBody ||
      'New admin activity',
  );

  const nativeNotification = new Notification({
    title: notificationTitle,
    body: notificationBody,
    silent: false,
  });

  logger.log(`[Electron] Showing admin activity notification: title="${notificationTitle}"`);
  nativeNotification.on('show', () => {
    logger.log('[Electron] Admin activity notification shown');
  });
  nativeNotification.on('failed', (notificationError) => {
    logger.error('[Electron] Admin activity notification failed:', notificationError);
  });
  nativeNotification.on('click', openAdminNotificationsFeed);
  nativeNotification.show();
}

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(import.meta.dirname, 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  return splashWindow;
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'Ambrosia POS',
    show: false,
  });

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash:close');
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
        mainWindow.show();
      }, STARTUP.SPLASH_DELAY_MILLISECONDS);
    } else {
      mainWindow.show();
    }
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.error('[Electron] Error Loading Page:', errorCode, errorDescription);

    dialog.showErrorBox(
      'Loading Error',
      `The application could not be loaded:\n${errorDescription}\n\nCode: ${errorCode}`,
    );
  });
}

async function handleStartupError(startupError) {
  logger.error('[Electron] Startup Error:', startupError);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  const isBackendTimeout = startupError.message && startupError.message.includes('Timed out waiting for');
  const javaHint = process.platform === 'win32' && isBackendTimeout
    ? '\n\nIf you have another Java version installed (Oracle JDK, OpenJDK, etc.), it may be conflicting with the bundled runtime. Try uninstalling other Java versions.'
    : '';

  const startupDialogResult = await dialog.showMessageBox({
    type: 'error',
    title: 'Startup Error',
    message: 'The application Ambrosia could not be started',
    detail: (startupError.message || startupError.toString()) + javaHint,
    buttons: ['Retry', 'Logs', 'Exit'],
    defaultId: 0,
    cancelId: 2,
  });

  const clickedButtonIndex = startupDialogResult.response;

  if (clickedButtonIndex === 0) {
    app.relaunch();
    app.quit();
  } else if (clickedButtonIndex === 1) {
    const logsDirectory = getLogsDirectory();
    shell.openPath(logsDirectory);
    setTimeout(() => app.quit(), 500);
  } else {
    app.quit();
  }
}

function createAppMenu() {
  const isMac = process.platform === 'darwin';

  const updateItem = {
    label: 'Check for Updates...',
    click: () => {
      if (autoUpdaterService) {
        autoUpdaterService.checkForUpdatesManual();
      }
    },
  };

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            updateItem,
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        }]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }]
          : [{ role: 'close' }]),
      ],
    },
    ...(!isMac
      ? [{
          label: 'Help',
          submenu: [
            updateItem,
            { type: 'separator' },
            {
              label: 'About Ambrosia POS',
              click: () => {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'About Ambrosia POS',
                  message: `Ambrosia POS v${app.getVersion()}`,
                  buttons: ['OK'],
                });
              },
            },
          ],
        }]
      : []),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  if (isMac) {
    updateMenuItem = menu.items[0].submenu.items[1];
  } else {
    const helpMenu = menu.items[menu.items.length - 1];
    updateMenuItem = helpMenu.submenu.items[0];
  }
}

async function initializeApp() {
  try {
    logger.log('[Electron] Initializing Ambrosia POS...');

    createSplashScreen();
    await new Promise((resolve) => splashWindow.webContents.once('did-finish-load', resolve));

    if (process.env.SPLASH_ONLY === 'true') {
      logger.log('[Electron] SPLASH ONLY MODE: Showing splash for design purposes');
      logger.log('[Electron] Edit splash.html and reload the window to see changes');
      logger.log('[Electron] Press Ctrl+R in the splash window to reload');

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.openDevTools();
      }

      return;
    }

    serviceManager = new ServiceManager();

    const updateSplash = (service, progress, message) => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash:update', { service, progress, message });
      }
    };

    const completeSplashStep = (service) => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash:complete', { service });
      }
    };

    updateSplash(null, 0, 'Initializing...');

    serviceManager.on('service:started', ({ service, port, skipped }) => {
      logger.log(`[Electron] Service started: ${service} on port ${port}`);

      let progress = 0;
      let message = '';

      if (service === 'phoenixd') {
        progress = 33;
        message = skipped ? 'NWC wallet configured' : 'Lightning Network ready';
        completeSplashStep('phoenixd');
        updateSplash('backend', progress, 'Starting Backend...');
      } else if (service === 'backend') {
        progress = 66;
        message = 'Backend server ready';
        completeSplashStep('backend');
        updateSplash('nextjs', progress, 'Starting Frontend...');
      } else if (service === 'nextjs') {
        progress = 100;
        message = 'Frontend ready';
        completeSplashStep('nextjs');
      }

      updateSplash(null, progress, message);
    });

    serviceManager.on('service:error', ({ service, serviceError }) => {
      logger.error(`[Electron] Service error: ${service}`, serviceError);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash:error', {
          service,
          message: serviceError ? serviceError.message || String(serviceError) : `Failed to start ${service || 'service'}`,
        });
      }
    });

    serviceManager.on('all:started', () => {
      logger.log('[Electron] All services are running');
    });

    if (serviceManager.isDevelopmentMode()) {
      updateSplash(null, 33, 'Development mode');
      updateSplash('nextjs', 66, 'Starting Frontend...');
    } else {
      const ambrosiaConfigPath = path.join(getDataDirectory(), 'ambrosia.conf');
      const nwcUriConfigured = Boolean(configurationBootstrap.readConfig(ambrosiaConfigPath)['nwc-uri']);
      updateSplash(
        'phoenixd',
        10,
        nwcUriConfigured ? 'Connecting to NWC wallet...' : 'Starting Lightning Network...',
      );
    }

    const url = await serviceManager.startAll();

    createWindow(url);

    createAppMenu();

    if (app.isPackaged) {
      autoUpdaterService = new AutoUpdater(mainWindow, {
        onMenuUpdate: updateMenuItemState,
        releaseUrl: 'https://github.com/olympus-btc/ambrosia/releases',
      });
      autoUpdaterService.startPeriodicChecks();
    }

    logger.log('[Electron] Application initialized successfully');
  } catch (initializationError) {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash:error', {
        service: null,
        message: initializationError ? initializationError.message || String(initializationError) : 'Unexpected startup error',
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
    }
    await handleStartupError(initializationError);
  }
}

ipcMain.handle('services:get-statuses', () => {
  if (!serviceManager) {
    return null;
  }
  return {
    statuses: serviceManager.getServiceStatuses(),
    ports: serviceManager.getPorts(),
    devMode: serviceManager.isDevelopmentMode(),
  };
});

ipcMain.handle('services:restart', async (_event, serviceName) => {
  if (!serviceManager) {
    throw new Error('ServiceManager not initialized');
  }
  try {
    await serviceManager.restartService(serviceName);
    return { success: true };
  } catch (restartError) {
    return { success: false, error: restartError.message };
  }
});

ipcMain.handle('services:get-logs', () => {
  const logsDirectory = getLogsDirectory();
  return { logsDir: logsDirectory };
});

ipcMain.handle('app:relaunch', () => {
  app.relaunch();
  app.quit();
});

ipcMain.on(ADMIN_ACTIVITY_NOTIFICATION_CHANNEL, (_event, notificationPayload) => {
  logger.log('[Electron] Admin activity notification IPC received');
  showAdminActivityNotification(notificationPayload);
});

const phoenixConfigPath = path.join(getPhoenixDataDirectory(), 'phoenix.conf');

let phoenixdRestartInProgress = false;

ipcMain.handle('phoenixd:get-auto-liquidity', () => {
  if (serviceManager?.configs?.ambrosia?.['nwc-uri']) {
    return { nwcConfigured: true };
  }
  const phoenixConfig = configurationBootstrap.readConfig(phoenixConfigPath);
  return phoenixConfig['auto-liquidity'] ?? 'off';
});

ipcMain.handle('phoenixd:set-auto-liquidity', async (_event, autoLiquiditySetting) => {
  if (!serviceManager) {
    throw new Error('ServiceManager not initialized');
  }
  if (serviceManager.configs?.ambrosia?.['nwc-uri']) {
    return { nwcConfigured: true };
  }
  if (phoenixdRestartInProgress) {
    throw new Error('A restart is already in progress');
  }

  const phoenixConfig = configurationBootstrap.readConfig(phoenixConfigPath);
  phoenixConfig['auto-liquidity'] = autoLiquiditySetting;
  configurationBootstrap.writeConfig(phoenixConfigPath, phoenixConfig);

  if (!serviceManager.isDevelopmentMode()) {
    if (serviceManager.externalServices.phoenixd) {
      return { requiresManualRestart: true };
    }

    if (serviceManager.configs?.phoenix) {
      serviceManager.configs.phoenix['auto-liquidity'] = autoLiquiditySetting;
    }
    phoenixdRestartInProgress = true;
    try {
      await serviceManager.restartService('phoenixd');
    } finally {
      phoenixdRestartInProgress = false;
    }
  }

  return true;
});

ipcMain.handle('secrets:get-storage-backend', () => unlockPasswordStore.getStorageBackend());

ipcMain.handle('secrets:save-unlock-password', (_event, unlockPassword) => {
  unlockPasswordStore.save(unlockPassword);
});

ipcMain.handle('secrets:clear-unlock-password', () => {
  unlockPasswordStore.clear();
});

function getLinuxPasswordStoreBackend() {
  const isKdeSession = Boolean(process.env.KDE_FULL_SESSION) || /kde/i.test(process.env.XDG_CURRENT_DESKTOP || '');
  return isKdeSession ? 'kwallet6' : 'gnome-libsecret';
}

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('password-store', getLinuxPasswordStoreBackend());
}

app.whenReady().then(initializeApp);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && !serviceManager) {
    initializeApp();
  }
});

app.on('before-quit', async (event) => {
  if (autoUpdaterService) {
    autoUpdaterService.destroy();
    autoUpdaterService = null;
  }
  if (serviceManager) {
    event.preventDefault();
    logger.log('[Electron] Shutting down services...');
    await serviceManager.stopAll();
    serviceManager = null;
    setTimeout(() => app.quit(), 500);
  }
});

app.on('window-all-closed', async () => {
  if (autoUpdaterService) {
    autoUpdaterService.destroy();
    autoUpdaterService = null;
  }
  if (serviceManager) {
    await serviceManager.stopAll();
    serviceManager = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (uncaughtError) => {
  logger.error('[Electron] Uncaught Exception:', uncaughtError);
  dialog.showErrorBox('Unexpected Error', uncaughtError.message || uncaughtError.toString());
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Electron] Unhandled Rejection at:', promise, 'reason:', reason);
});
