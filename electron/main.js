const path = require('path');

const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');

const AutoUpdater = require('./services/AutoUpdater');
const { readConfig, writeConfig } = require('./services/ConfigurationBootstrap');
const ServiceManager = require('./services/ServiceManager');
const logger = require('./utils/logger');
const { getPhoenixDataDirectory } = require('./utils/resourcePaths');

// To prevent multiple instances of the application
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.log('[Electron] Another instance is already running. Exiting...');
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // If someone tries to open a second instance, focus the existing window
    logger.log('[Electron] Second instance detected, focusing existing window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Global state
let mainWindow = null;
let splashWindow = null;
let serviceManager = null;
let autoUpdaterService = null;
let updateMenuItem = null;

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

// Splash Screen Creation
function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  return splashWindow;
}

// Main Window Creation
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'Ambrosia POS',
    show: false,
  });

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    // Close splash and show main window
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash:close');
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
        mainWindow.show();
      }, 800);
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

  // Handle loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('[Electron] Error Loading Page:', errorCode, errorDescription);

    dialog.showErrorBox(
      'Loading Error',
      `The application could not be loaded:\n${errorDescription}\n\nCode: ${errorCode}`,
    );
  });
}

// Handle global errors
async function handleStartupError(error) {
  logger.error('[Electron] Startup Error:', error);

  // Close splash window if it exists
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  const response = await dialog.showMessageBox({
    type: 'error',
    title: 'Startup Error',
    message: 'The application Ambrosia could not be started',
    detail: error.message || error.toString(),
    buttons: ['Retry', 'Logs', 'Exit'],
    defaultId: 0,
    cancelId: 2,
  });

  if (response.response === 0) {
    app.relaunch();
    app.quit();
  } else if (response.response === 1) {
    const logsDir = path.join(require('os').homedir(), '.Ambrosia-POS', 'logs');
    shell.openPath(logsDir);
    setTimeout(() => app.quit(), 500);
  } else {
    app.quit();
  }
}

// Application Menu
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

  // Store reference to update menu item for dynamic updates
  if (isMac) {
    updateMenuItem = menu.items[0].submenu.items[1];
  } else {
    const helpMenu = menu.items[menu.items.length - 1];
    updateMenuItem = helpMenu.submenu.items[0];
  }
}

// IPC Handlers to communicate with renderer
ipcMain.handle('services:get-statuses', () => {
  if (!serviceManager) {
    return null;
  }
  return {
    statuses: serviceManager.getServiceStatuses(),
    ports: serviceManager.getPorts(),
    devMode: serviceManager.isDevMode(),
  };
});

ipcMain.handle('services:restart', async (event, serviceName) => {
  if (!serviceManager) {
    throw new Error('ServiceManager not initialized');
  }
  try {
    await serviceManager.restartService(serviceName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('services:get-logs', () => {
  const logsDir = path.join(require('os').homedir(), '.Ambrosia-POS', 'logs');
  return { logsDir };
});

const phoenixConfigPath = path.join(getPhoenixDataDirectory(), 'phoenix.conf');

let phoenixdRestartInProgress = false;

ipcMain.handle('phoenixd:get-auto-liquidity', () => {
  const phoenixConfig = readConfig(phoenixConfigPath);
  return phoenixConfig['auto-liquidity'] ?? 'off';
});

ipcMain.handle('phoenixd:set-auto-liquidity', async (_event, value) => {
  if (!serviceManager) {
    throw new Error('ServiceManager not initialized');
  }
  if (phoenixdRestartInProgress) {
    throw new Error('A restart is already in progress');
  }

  const phoenixConfig = readConfig(phoenixConfigPath);
  phoenixConfig['auto-liquidity'] = value;
  writeConfig(phoenixConfigPath, phoenixConfig);

  if (!serviceManager.isDevMode()) {
    if (serviceManager.configs?.phoenix) {
      serviceManager.configs.phoenix['auto-liquidity'] = value;
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

// App initialization
app.whenReady().then(async () => {
  try {
    logger.log('[Electron] Initializing Ambrosia POS...');

    // Show splash screen and wait for it to finish loading before sending IPC
    createSplashScreen();
    await new Promise((resolve) => splashWindow.webContents.once('did-finish-load', resolve));

    // SPLASH ONLY MODE: For design/testing purposes
    if (process.env.SPLASH_ONLY === 'true') {
      logger.log('[Electron] SPLASH ONLY MODE: Showing splash for design purposes');
      logger.log('[Electron] Edit splash.html and reload the window to see changes');
      logger.log('[Electron] Press Ctrl+R in the splash window to reload');

      // Enable DevTools for splash window in splash-only mode
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.openDevTools();
      }

      return; // Exit here, don't start services
    }

    serviceManager = new ServiceManager();

    // Helper to update splash progress
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

    // Track service startup progress
    updateSplash(null, 0, 'Initializing...');

    serviceManager.on('service:started', ({ service, port }) => {
      logger.log(`[Electron] Service started: ${service} on port ${port}`);

      // Update progress based on service
      let progress = 0;
      let message = '';

      if (service === 'phoenixd') {
        progress = 33;
        message = 'Lightning Network ready';
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

    serviceManager.on('service:error', ({ service, error }) => {
      logger.error(`[Electron] Service error: ${service}`, error);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash:error', {
          service,
          message: error ? error.message || String(error) : `Failed to start ${service || 'service'}`,
        });
      }
    });

    serviceManager.on('all:started', () => {
      logger.log('[Electron] All services are running');
    });

    // Start with initial message
    if (serviceManager.isDevMode()) {
      updateSplash(null, 33, 'Development mode');
      updateSplash('nextjs', 66, 'Starting Frontend...');
    } else {
      updateSplash('phoenixd', 10, 'Starting Lightning Network...');
    }

    const url = await serviceManager.startAll();

    createWindow(url);

    createAppMenu();

    // Start auto-update checks (production only)
    if (app.isPackaged) {
      autoUpdaterService = new AutoUpdater(mainWindow, {
        onMenuUpdate: updateMenuItemState,
        releaseUrl: 'https://github.com/olympus-btc/ambrosia/releases',
      });
      autoUpdaterService.startPeriodicChecks();
    }

    logger.log('[Electron] Application initialized successfully');
  } catch (error) {
    // Show error state in splash before closing
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash:error', {
        service: null,
        message: error ? error.message || String(error) : 'Unexpected startup error',
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
    }
    await handleStartupError(error);
  }
});

// Activation handler (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serviceManager) {
    const ports = serviceManager.getPorts();
    if (ports.nextjs) {
      createWindow(`http://localhost:${ports.nextjs}`);
    }
  }
});

// Clean shutdown
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

// Crash handler
process.on('uncaughtException', (error) => {
  logger.error('[Electron] Uncaught Exception:', error);
  dialog.showErrorBox('Unexpected Error', error.message || error.toString());
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Electron] Unhandled Rejection at:', promise, 'reason:', reason);
});
