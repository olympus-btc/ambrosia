const { EventEmitter } = require('events');
const fs = require('fs');

const electronUpdaterPath = require.resolve('electron-updater');
let fakeAutoUpdater;

function installElectronUpdaterMock() {
  fakeAutoUpdater = new EventEmitter();
  fakeAutoUpdater.checkForUpdates = vi.fn().mockResolvedValue(undefined);
  fakeAutoUpdater.downloadUpdate = vi.fn();
  fakeAutoUpdater.quitAndInstall = vi.fn();
  require.cache[electronUpdaterPath] = {
    id: electronUpdaterPath,
    filename: electronUpdaterPath,
    loaded: true,
    exports: { autoUpdater: fakeAutoUpdater },
  };
}

const { installElectronMock } = require('../../test-utils/electronMock.js');
const { setPlatformAndArch, restorePlatformAndArch } = require('../../test-utils/platformMock.js');

let logger;

const dialogMock = { showMessageBox: vi.fn() };
const ipcMainMock = { handle: vi.fn(), removeHandler: vi.fn() };
const shellMock = { openExternal: vi.fn() };

installElectronMock({ dialog: dialogMock, ipcMain: ipcMainMock, shell: shellMock });
installElectronUpdaterMock();

function createFakeMainWindow() {
  return {
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: { send: vi.fn() },
  };
}

function ipcHandlerFor(channel) {
  const call = ipcMainMock.handle.mock.calls.find(([registeredChannel]) => registeredChannel === channel);
  return call[1];
}

async function loadFreshAutoUpdater() {
  vi.resetModules();
  const autoUpdaterModule = await import('../AutoUpdater.js');
  ({ logger } = await import('../../utils/logger.js'));
  return autoUpdaterModule.default;
}

afterEach(() => {
  restorePlatformAndArch();
  vi.clearAllMocks();
  fakeAutoUpdater.removeAllListeners();
});

describe('outside Windows', () => {
  let AutoUpdater;
  let mainWindow;
  let onMenuUpdate;

  beforeAll(async () => {
    setPlatformAndArch('darwin', 'arm64');
    AutoUpdater = await loadFreshAutoUpdater();
  });

  beforeEach(() => {
    mainWindow = createFakeMainWindow();
    onMenuUpdate = vi.fn();
    dialogMock.showMessageBox.mockResolvedValue({ response: 1 });
    fakeAutoUpdater.checkForUpdates.mockResolvedValue(undefined);
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(logger, 'log').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  it('does not prompt for a pending update on construction, even if one is stale', () => {
    fs.existsSync.mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ version: '1.2.0', downloadedAt: 0 }));

    new AutoUpdater(mainWindow, { releaseUrl: 'https://example.com/releases' });

    expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
  });

  it('notifies the renderer and updates the menu, without auto-downloading', () => {
    new AutoUpdater(mainWindow, { onMenuUpdate, releaseUrl: 'https://example.com/releases' });

    fakeAutoUpdater.emit('update-available', { version: '1.2.0' });

    expect(fakeAutoUpdater.downloadUpdate).not.toHaveBeenCalled();
    expect(onMenuUpdate).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('update:available', { version: '1.2.0' });
  });

  it('opens the tagged release page when the update-available menu item is clicked', async () => {
    new AutoUpdater(mainWindow, { onMenuUpdate, releaseUrl: 'https://example.com/releases' });
    fakeAutoUpdater.emit('update-available', { version: '1.2.0' });
    dialogMock.showMessageBox.mockResolvedValue({ response: 0 });

    const { click } = onMenuUpdate.mock.calls[0][0];
    click();
    await Promise.resolve().then().then();

    expect(shellMock.openExternal).toHaveBeenCalledWith('https://example.com/releases/tag/v1.2.0');
  });

  it('shows an up-to-date dialog only for a manual check', async () => {
    const autoUpdater = new AutoUpdater(mainWindow, { onMenuUpdate });
    autoUpdater.checkForUpdatesManual();

    fakeAutoUpdater.emit('update-not-available', { version: '1.2.0' });
    await Promise.resolve();

    expect(dialogMock.showMessageBox).toHaveBeenCalledWith(mainWindow, expect.objectContaining({ title: 'No Updates Available' }));
  });

  it('does not show an up-to-date dialog for a background check', () => {
    new AutoUpdater(mainWindow, { onMenuUpdate });

    fakeAutoUpdater.emit('update-not-available', { version: '1.2.0' });

    expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
  });

  it('shows an error dialog only for a manual check', () => {
    const autoUpdater = new AutoUpdater(mainWindow, { onMenuUpdate });
    autoUpdater.checkForUpdatesManual();

    fakeAutoUpdater.emit('error', new Error('network unreachable'));

    expect(dialogMock.showMessageBox).toHaveBeenCalledWith(mainWindow, expect.objectContaining({ detail: 'network unreachable' }));
  });

  it('does not show an error dialog for a background check', () => {
    new AutoUpdater(mainWindow, { onMenuUpdate });

    fakeAutoUpdater.emit('error', new Error('network unreachable'));

    expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
  });

  it('does nothing when update:install is invoked', () => {
    new AutoUpdater(mainWindow);

    ipcHandlerFor('update:install')();

    expect(fakeAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('opens the bare release url when update:open-release is invoked with no pending version', () => {
    new AutoUpdater(mainWindow, { releaseUrl: 'https://example.com/releases' });

    ipcHandlerFor('update:open-release')();

    expect(shellMock.openExternal).toHaveBeenCalledWith('https://example.com/releases');
  });

  it('shows an error dialog and resets the menu when a manual check fails to even start', async () => {
    fakeAutoUpdater.checkForUpdates.mockReturnValue(Promise.reject(new Error('offline')));
    const autoUpdater = new AutoUpdater(mainWindow, { onMenuUpdate });

    autoUpdater.checkForUpdatesManual();
    await Promise.resolve().then().then();

    expect(dialogMock.showMessageBox).toHaveBeenCalledWith(mainWindow, expect.objectContaining({ detail: 'offline' }));
    expect(onMenuUpdate).toHaveBeenLastCalledWith({ label: 'Check for Updates...', enabled: true });
  });

  it('does not show a dialog when a background check fails to even start', async () => {
    fakeAutoUpdater.checkForUpdates.mockReturnValue(Promise.reject(new Error('offline')));
    const autoUpdater = new AutoUpdater(mainWindow, { onMenuUpdate });

    autoUpdater.checkForUpdates();
    await Promise.resolve().then().then();

    expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
  });

  it('repeats checkForUpdates on the given interval', async () => {
    vi.useFakeTimers();
    const autoUpdater = new AutoUpdater(mainWindow);
    fakeAutoUpdater.checkForUpdates.mockClear();

    autoUpdater.startPeriodicChecks(1000);
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);

    autoUpdater.stopPeriodicChecks();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fakeAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('removes both ipc handlers on destroy', () => {
    const autoUpdater = new AutoUpdater(mainWindow);

    autoUpdater.destroy();

    expect(ipcMainMock.removeHandler).toHaveBeenCalledWith('update:install');
    expect(ipcMainMock.removeHandler).toHaveBeenCalledWith('update:open-release');
  });
});

describe('on Windows', () => {
  let AutoUpdater;
  let mainWindow;
  let onMenuUpdate;

  beforeAll(async () => {
    setPlatformAndArch('win32', 'x64');
    AutoUpdater = await loadFreshAutoUpdater();
  });

  beforeEach(() => {
    mainWindow = createFakeMainWindow();
    onMenuUpdate = vi.fn();
    dialogMock.showMessageBox.mockResolvedValue({ response: 1 });
    fakeAutoUpdater.checkForUpdates.mockResolvedValue(undefined);
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    vi.spyOn(logger, 'log').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  it('silently downloads the update instead of notifying the renderer', () => {
    new AutoUpdater(mainWindow, { onMenuUpdate });

    fakeAutoUpdater.emit('update-available', { version: '1.2.0' });

    expect(fakeAutoUpdater.downloadUpdate).toHaveBeenCalled();
    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it('saves the update state and notifies the renderer once downloaded', () => {
    new AutoUpdater(mainWindow, { onMenuUpdate });

    fakeAutoUpdater.emit('update-downloaded', { version: '1.2.0' });

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('pending-update.json'),
      expect.stringContaining('"version":"1.2.0"'),
    );
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('update:downloaded', { version: '1.2.0' });
  });

  it('quits and installs when update:install is invoked', () => {
    new AutoUpdater(mainWindow);

    ipcHandlerFor('update:install')();

    expect(fakeAutoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('does not prompt when there is no pending update file', () => {
    new AutoUpdater(mainWindow);

    expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
  });

  it('does not prompt when the pending update is not yet expired', () => {
    fs.existsSync.mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ version: '1.2.0', downloadedAt: Date.now() }));

    new AutoUpdater(mainWindow);

    expect(dialogMock.showMessageBox).not.toHaveBeenCalled();
  });

  it('prompts to restart when a pending update is older than 7 days', () => {
    fs.existsSync.mockReturnValue(true);
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ version: '1.2.0', downloadedAt: eightDaysAgo }));

    new AutoUpdater(mainWindow);

    expect(dialogMock.showMessageBox).toHaveBeenCalledWith(mainWindow, expect.objectContaining({ title: 'Update Ready to Install' }));
  });

  it('clears the pending update and installs when the user confirms the restart prompt', async () => {
    fs.existsSync.mockReturnValue(true);
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ version: '1.2.0', downloadedAt: eightDaysAgo }));
    dialogMock.showMessageBox.mockResolvedValue({ response: 0 });

    new AutoUpdater(mainWindow);
    await Promise.resolve().then().then();

    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(fakeAutoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('does not crash when the pending update file is corrupted', () => {
    fs.existsSync.mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('not valid json');

    expect(() => new AutoUpdater(mainWindow)).not.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });
});
