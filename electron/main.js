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
let serviceManager = null;

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
    mainWindow.show();
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

    serviceManager = new ServiceManager();

    serviceManager.on('service:started', ({ service, port }) => {
      console.log(`[Electron] Service started: ${service} on port ${port}`);
    });

    serviceManager.on('service:error', ({ service, error }) => {
      console.error(`[Electron] Service error: ${service}`, error);
    });

    serviceManager.on('all:started', () => {
      console.log('[Electron] All services are running');
    });

    const url = await serviceManager.startAll();

    createWindow(url);

    console.log('[Electron] Application initialized successfully');
  } catch (error) {
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
