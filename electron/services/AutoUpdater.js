const { dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const SUPPORTS_AUTO_UPDATE = process.platform === 'win32';

class AutoUpdater {
  constructor(mainWindow, { onMenuUpdate, releaseUrl } = {}) {
    this.mainWindow = mainWindow;
    this.checkInterval = null;
    this.isManualCheck = false;
    this.onMenuUpdate = onMenuUpdate || (() => {});
    this.releaseUrl = releaseUrl || '';
    this.pendingVersion = null;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.forceCodeSigning = false;
    autoUpdater.logger = console;

    this._setupEvents();
    this._setupIpcHandlers();
  }

  _setupEvents() {
    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info.version);
      this.pendingVersion = info.version;
      this.isManualCheck = false;

      if (SUPPORTS_AUTO_UPDATE) {
        // Windows: download silently
        this.onMenuUpdate({ label: 'Downloading Update...', enabled: false });
        autoUpdater.downloadUpdate();
      } else {
        // macOS/Linux: notify and let user go to release page
        this.onMenuUpdate({
          label: `Update Available: ${info.version}`,
          enabled: true,
          click: () => this._showUpdateAvailableDialog(info.version),
        });
        this._sendToRenderer('update:available', { version: info.version });
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('[AutoUpdater] Up to date:', info.version);
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
      if (this.isManualCheck) {
        this.isManualCheck = false;
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'No Updates Available',
          message: 'You\'re up to date!',
          detail: `Ambrosia POS ${info.version} is the latest version.`,
          buttons: ['OK'],
        });
      }
    });

    autoUpdater.on('download-progress', (progress) => {
      console.log('[AutoUpdater] Download progress:', `${progress.percent.toFixed(1)}%`);
    });

    // Only fires on Windows (only platform that downloads)
    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.onMenuUpdate({
        label: `Restart to Update to ${info.version}`,
        enabled: true,
        click: () => autoUpdater.quitAndInstall(false, true),
      });
      this._sendToRenderer('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', (error) => {
      console.error('[AutoUpdater] Error:', error.message);
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
      if (this.isManualCheck) {
        this.isManualCheck = false;
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'Update Error',
          message: 'Could not check for updates',
          detail: error.message,
          buttons: ['OK'],
        });
      }
    });
  }

  _setupIpcHandlers() {
    ipcMain.handle('update:install', () => {
      if (SUPPORTS_AUTO_UPDATE) {
        autoUpdater.quitAndInstall(false, true);
      }
    });

    ipcMain.handle('update:open-release', () => {
      this._openReleasePage(this.pendingVersion);
    });
  }

  _showUpdateAvailableDialog(version) {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${version} is available.`,
      detail: 'Would you like to go to the download page?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        this._openReleasePage(version);
      }
    });
  }

  _openReleasePage(version) {
    const url = version
      ? `${this.releaseUrl}/tag/v${version}`
      : this.releaseUrl;
    shell.openExternal(url);
  }

  _sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  checkForUpdates() {
    this.onMenuUpdate({ label: 'Checking for Updates...', enabled: false });
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[AutoUpdater] Scheduled check failed:', err.message);
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
    });
  }

  checkForUpdatesManual() {
    this.isManualCheck = true;
    this.onMenuUpdate({ label: 'Checking for Updates...', enabled: false });
    autoUpdater.checkForUpdates().catch((err) => {
      this.isManualCheck = false;
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
      dialog.showMessageBox(this.mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Could not check for updates',
        detail: err.message,
        buttons: ['OK'],
      });
    });
  }

  startPeriodicChecks(intervalMs = 6 * 60 * 60 * 1000) {
    this.checkForUpdates();
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);
  }

  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  destroy() {
    this.stopPeriodicChecks();
    ipcMain.removeHandler('update:install');
    ipcMain.removeHandler('update:open-release');
  }
}

module.exports = AutoUpdater;
