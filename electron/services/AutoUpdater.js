import fs from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';

import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);
const { dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const SUPPORTS_AUTO_UPDATE = process.platform === 'win32';
const UPDATE_EXPIRY_DAYS = 7;
const UPDATE_STATE_FILE = path.join(os.homedir(), '.Ambrosia-POS', 'pending-update.json');

export default class AutoUpdater {
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
      const updateStateDirectory = path.dirname(UPDATE_STATE_FILE);
      if (!fs.existsSync(updateStateDirectory)) fs.mkdirSync(updateStateDirectory, { recursive: true });
      fs.writeFileSync(UPDATE_STATE_FILE, JSON.stringify({ version, downloadedAt: Date.now() }));
    } catch (saveError) {
      logger.error('[AutoUpdater] Failed to save update state:', saveError.message);
    }
  }

  _clearUpdateState() {
    try {
      if (fs.existsSync(UPDATE_STATE_FILE)) fs.unlinkSync(UPDATE_STATE_FILE);
    } catch (clearError) {
      logger.error('[AutoUpdater] Failed to clear update state:', clearError.message);
    }
  }

  _checkExpiredUpdate() {
    if (!SUPPORTS_AUTO_UPDATE) return;
    try {
      if (!fs.existsSync(UPDATE_STATE_FILE)) return;
      const pendingUpdateState = JSON.parse(fs.readFileSync(UPDATE_STATE_FILE, 'utf8'));
      const downloadAgeMilliseconds = Date.now() - (pendingUpdateState.downloadedAt || 0);
      const downloadAgeDays = downloadAgeMilliseconds / (1000 * 60 * 60 * 24);
      if (downloadAgeDays >= UPDATE_EXPIRY_DAYS) {
        logger.log(`[AutoUpdater] Pending update v${pendingUpdateState.version} is ${Math.floor(downloadAgeDays)} days old — prompting install`);
        dialog.showMessageBox(this.mainWindow, {
          type: 'warning',
          title: 'Update Ready to Install',
          message: `Version ${pendingUpdateState.version} has been waiting ${Math.floor(downloadAgeDays)} days`,
          detail: 'Restart Ambrosia POS now to apply the update.',
          buttons: ['Restart Now', 'Later'],
          defaultId: 0,
          cancelId: 1,
        }).then(({ response: buttonIndex }) => {
          if (buttonIndex === 0) {
            this._clearUpdateState();
            autoUpdater.quitAndInstall(false, true);
          }
        });
      }
    } catch (checkExpiredError) {
      logger.error('[AutoUpdater] Failed to check pending update state:', checkExpiredError.message);
    }
  }

  _setupEvents() {
    autoUpdater.on('update-available', (updateInfo) => {
      logger.log('[AutoUpdater] Update available:', updateInfo.version);
      this.pendingVersion = updateInfo.version;
      this.isManualCheck = false;

      if (SUPPORTS_AUTO_UPDATE) {
        this.onMenuUpdate({ label: 'Downloading Update...', enabled: false });
        autoUpdater.downloadUpdate();
      } else {
        this.onMenuUpdate({
          label: `Update Available: ${updateInfo.version}`,
          enabled: true,
          click: () => this._showUpdateAvailableDialog(updateInfo.version),
        });
        this._sendToRenderer('update:available', { version: updateInfo.version });
      }
    });

    autoUpdater.on('update-not-available', (updateInfo) => {
      logger.log('[AutoUpdater] Up to date:', updateInfo.version);
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
      if (this.isManualCheck) {
        this.isManualCheck = false;
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'No Updates Available',
          message: 'You\'re up to date!',
          detail: `Ambrosia POS ${updateInfo.version} is the latest version.`,
          buttons: ['OK'],
        });
      }
    });

    autoUpdater.on('download-progress', (downloadProgress) => {
      logger.log('[AutoUpdater] Download progress:', `${downloadProgress.percent.toFixed(1)}%`);
    });

    autoUpdater.on('update-downloaded', (updateInfo) => {
      logger.log('[AutoUpdater] Update downloaded:', updateInfo.version);
      this._saveUpdateState(updateInfo.version);
      this.onMenuUpdate({
        label: `Restart to Update to ${updateInfo.version}`,
        enabled: true,
        click: () => {
          this._clearUpdateState();
          autoUpdater.quitAndInstall(false, true);
        },
      });
      this._sendToRenderer('update:downloaded', { version: updateInfo.version });
    });

    autoUpdater.on('error', (updaterError) => {
      logger.error('[AutoUpdater] Error:', updaterError.message);
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
      if (this.isManualCheck) {
        this.isManualCheck = false;
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'Update Error',
          message: 'Could not check for updates',
          detail: updaterError.message,
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
    }).then(({ response: buttonIndex }) => {
      if (buttonIndex === 0) {
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

  _sendToRenderer(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }

  checkForUpdates() {
    this.onMenuUpdate({ label: 'Checking for Updates...', enabled: false });
    autoUpdater.checkForUpdates().catch((checkError) => {
      logger.error('[AutoUpdater] Scheduled check failed:', checkError.message);
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
    });
  }

  checkForUpdatesManual() {
    this.isManualCheck = true;
    this.onMenuUpdate({ label: 'Checking for Updates...', enabled: false });
    autoUpdater.checkForUpdates().catch((checkError) => {
      this.isManualCheck = false;
      this.onMenuUpdate({ label: 'Check for Updates...', enabled: true });
      dialog.showMessageBox(this.mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Could not check for updates',
        detail: checkError.message,
        buttons: ['OK'],
      });
    });
  }

  startPeriodicChecks(intervalMilliseconds = 6 * 60 * 60 * 1000) {
    this.checkForUpdates();
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMilliseconds);
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
