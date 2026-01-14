const path = require('path');

const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');

const ServiceManager = require('./services/ServiceManager');

// To prevent multiple instances of the application
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Electron] Another instance is already running. Exiting...');
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Si alguien intenta abrir una segunda instancia, enfocamos la ventana existente
    console.log('[Electron] Second instance detected, focusing existing window');
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
      nodeIntegration: true,
      contextIsolation: false,
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
    minHeight: 768,
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
    console.error('[Electron] Error Loading Page:', errorCode, errorDescription);

    dialog.showErrorBox(
      'Loading Error',
      `The application could not be loaded:\n${errorDescription}\n\nCode: ${errorCode}`,
    );
  });
}

// Handle global errors
async function handleStartupError(error) {
  console.error('[Electron] Startup Error:', error);

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

// App initialization
app.whenReady().then(async () => {
  try {
    console.log('[Electron] Initializing Ambrosia POS...');

    // Show splash screen immediately
    createSplashScreen();

    // SPLASH ONLY MODE: For design/testing purposes
    if (process.env.SPLASH_ONLY === 'true') {
      console.log('[Electron] SPLASH ONLY MODE: Showing splash for design purposes');
      console.log('[Electron] Edit splash.html and reload the window to see changes');
      console.log('[Electron] Press Ctrl+R in the splash window to reload');

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
      console.log(`[Electron] Service started: ${service} on port ${port}`);

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
      console.error(`[Electron] Service error: ${service}`, error);
      updateSplash(null, null, `Error starting ${service || 'service'}`);
    });

    serviceManager.on('all:started', () => {
      console.log('[Electron] All services are running');
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

    console.log('[Electron] Application initialized successfully');
  } catch (error) {
    // Close splash on error
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
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
  if (serviceManager) {
    event.preventDefault();
    console.log('[Electron] Shutting down services...');
    await serviceManager.stopAll();
    serviceManager = null;
    setTimeout(() => app.quit(), 500);
  }
});

app.on('window-all-closed', async () => {
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
  console.error('[Electron] Uncaught Exception:', error);
  dialog.showErrorBox('Error Inesperado', error.message || error.toString());
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Electron] Unhandled Rejection at:', promise, 'reason:', reason);
});
