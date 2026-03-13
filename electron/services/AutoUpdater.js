const fs = require('fs');
const os = require('os');
const path = require('path');

const { dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const SUPPORTS_AUTO_UPDATE = process.platform === 'win32';
const UPDATE_EXPIRY_DAYS = 7;
const UPDATE_STATE_FILE = path.join(os.homedir(), '.Ambrosia-POS', 'pending-update.json');

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
    this._checkExpiredUpdate();
  }

  _saveUpdateState(version) {
    try {
      const dir = path.dirname(UPDATE_STATE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(UPDATE_STATE_FILE, JSON.stringify({ version, downloadedAt: Date.now() }));
    } catch (err) {
      console.error('[AutoUpdater] Failed to save update state:', err.message);
    }
  }

  _clearUpdateState() {
    try {
      if (fs.existsSync(UPDATE_STATE_FILE)) fs.unlinkSync(UPDATE_STATE_FILE);
    } catch (err) {
      console.error('[AutoUpdater] Failed to clear update state:', err.message);
    }
  }

  _checkExpiredUpdate() {
    if (!SUPPORTS_AUTO_UPDATE) return;
    try {
      if (!fs.existsSync(UPDATE_STATE_FILE)) return;
      const state = JSON.parse(fs.readFileSync(UPDATE_STATE_FILE, 'utf8'));
      const ageMs = Date.now() - (state.downloadedAt || 0);
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays >= UPDATE_EXPIRY_DAYS) {
        console.log(`[AutoUpdater] Pending update v${state.version} is ${Math.floor(ageDays)} days old — prompting install`);
        dialog.showMessageBox(this.mainWindow, {
          type: 'warning',
          title: 'Update Ready to Install',
          message: `Version ${state.version} has been waiting ${Math.floor(ageDays)} days`,
          detail: 'Restart Ambrosia POS now to apply the update.',
          buttons: ['Restart Now', 'Later'],
          defaultId: 0,
          cancelId: 1,
        }).then(({ response }) => {
          if (response === 0) {
            this._clearUpdateState();
            autoUpdater.quitAndInstall(false, true);
          }
        });
      }
    } catch (err) {
      console.error('[AutoUpdater] Failed to check pending update state:', err.message);
    }
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
      this._saveUpdateState(info.version);
      this.onMenuUpdate({
        label: `Restart to Update to ${info.version}`,
        enabled: true,
        click: () => {
          this._clearUpdateState();
          autoUpdater.quitAndInstall(false, true);
        },
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
        this._clearUpdateState();
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
