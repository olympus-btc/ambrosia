const fs = require('fs');
const os = require('os');

const electronUpdaterPath = require.resolve('electron-updater');

function installElectronUpdaterMock() {
  const fakeAutoUpdater = {
    on: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  };
  require.cache[electronUpdaterPath] = {
    id: electronUpdaterPath,
    filename: electronUpdaterPath,
    loaded: true,
    exports: { autoUpdater: fakeAutoUpdater },
  };
}

const {
  installElectronMock,
  setSelectedStorageBackend,
  setEncryptionAvailable,
  resetElectronMock,
} = require('../test-utils/electronMock.js');
const { setPlatformAndArch, restorePlatformAndArch } = require('../test-utils/platformMock.js');
const { installSpawnMock } = require('../test-utils/spawnMock.js');
const { installTreeKillMock } = require('../test-utils/treeKillMock.js');

function createFakeNotificationClass() {
  const createdInstances = [];
  function FakeNotification(options) {
    this.options = options;
    this.on = vi.fn();
    this.show = vi.fn();
    createdInstances.push(this);
  }
  FakeNotification.isSupported = vi.fn().mockReturnValue(true);
  FakeNotification.createdInstances = createdInstances;
  return FakeNotification;
}

function createFakeElectronApp() {
  return {
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    setName: vi.fn(),
    whenReady: vi.fn().mockReturnValue(new Promise(() => {})),
    on: vi.fn(),
    quit: vi.fn(),
    relaunch: vi.fn(),
    getVersion: vi.fn().mockReturnValue('0.8.0-beta'),
    isPackaged: false,
    name: 'Ambrosia',
    commandLine: { appendSwitch: vi.fn() },
  };
}

async function loadFreshMain(configureAppMock) {
  const appMock = createFakeElectronApp();
  const ipcMainMock = { handle: vi.fn(), on: vi.fn() };
  if (configureAppMock) configureAppMock(appMock);

  vi.resetModules();
  installSpawnMock();
  installTreeKillMock();
  installElectronUpdaterMock();
  installElectronMock({
    app: appMock,
    BrowserWindow: vi.fn(),
    Menu: { buildFromTemplate: vi.fn().mockReturnValue({ items: [] }), setApplicationMenu: vi.fn() },
    Notification: createFakeNotificationClass(),
    dialog: { showMessageBox: vi.fn(), showErrorBox: vi.fn() },
    shell: { openPath: vi.fn(), openExternal: vi.fn() },
    ipcMain: ipcMainMock,
  });
  vi.spyOn(os, 'homedir').mockReturnValue('/fake/home');
  vi.spyOn(fs, 'existsSync').mockReturnValue(false);
  await import('../main.js');

  return appMock;
}

function collectHandlersByChannel(ipcMainMock) {
  const handlersByChannel = {};
  ipcMainMock.handle.mock.calls.forEach(([channel, handler]) => {
    handlersByChannel[channel] = handler;
  });
  return handlersByChannel;
}

function collectListenersByChannel(ipcMainMock) {
  const listenersByChannel = {};
  ipcMainMock.on.mock.calls.forEach(([channel, listener]) => {
    listenersByChannel[channel] = listener;
  });
  return listenersByChannel;
}

describe('IPC handlers and notifications', () => {
  const appMock = createFakeElectronApp();
  const NotificationMock = createFakeNotificationClass();
  const ipcMainMock = { handle: vi.fn(), on: vi.fn() };
  let ipcHandlersByChannel;
  let ipcListenersByChannel;

  beforeAll(() => {
    installSpawnMock();
    installTreeKillMock();
    installElectronUpdaterMock();
    installElectronMock({
      app: appMock,
      BrowserWindow: vi.fn(),
      Menu: { buildFromTemplate: vi.fn().mockReturnValue({ items: [] }), setApplicationMenu: vi.fn() },
      Notification: NotificationMock,
      dialog: { showMessageBox: vi.fn(), showErrorBox: vi.fn() },
      shell: { openPath: vi.fn(), openExternal: vi.fn() },
      ipcMain: ipcMainMock,
    });
    require('../main.js');
    ipcHandlersByChannel = collectHandlersByChannel(ipcMainMock);
    ipcListenersByChannel = collectListenersByChannel(ipcMainMock);
  });

  beforeEach(() => {
    vi.spyOn(os, 'homedir').mockReturnValue('/fake/home');
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('');
    NotificationMock.isSupported.mockReturnValue(true);
    NotificationMock.createdInstances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('services:get-statuses', () => {
    it('returns null before the service manager has been created', () => {
      expect(ipcHandlersByChannel['services:get-statuses']()).toBe(null);
    });
  });

  describe('services:restart', () => {
    it('rejects before the service manager has been created', async () => {
      await expect(ipcHandlersByChannel['services:restart']({}, 'backend'))
        .rejects.toThrow('ServiceManager not initialized');
    });
  });

  describe('services:get-logs', () => {
    it('returns the logs directory', () => {
      expect(ipcHandlersByChannel['services:get-logs']()).toEqual({
        logsDir: '/fake/home/.Ambrosia-POS/logs',
      });
    });
  });

  describe('app:relaunch', () => {
    it('relaunches and quits the app', () => {
      ipcHandlersByChannel['app:relaunch']();

      expect(appMock.relaunch).toHaveBeenCalled();
      expect(appMock.quit).toHaveBeenCalled();
    });
  });

  describe('phoenixd:get-auto-liquidity', () => {
    it('returns "off" when no phoenix.conf exists yet', () => {
      expect(ipcHandlersByChannel['phoenixd:get-auto-liquidity']()).toBe('off');
    });

    it('returns the configured value from phoenix.conf', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('auto-liquidity=medium\n');

      expect(ipcHandlersByChannel['phoenixd:get-auto-liquidity']()).toBe('medium');
    });
  });

  describe('phoenixd:set-auto-liquidity', () => {
    it('rejects before the service manager has been created', async () => {
      await expect(ipcHandlersByChannel['phoenixd:set-auto-liquidity']({}, 'medium'))
        .rejects.toThrow('ServiceManager not initialized');
    });
  });

  describe('secrets:get-storage-backend', () => {
    afterEach(() => {
      resetElectronMock();
      restorePlatformAndArch();
    });

    it('returns the backend reported by safeStorage on Linux', () => {
      setPlatformAndArch('linux', 'x64');
      setSelectedStorageBackend('kwallet');

      expect(ipcHandlersByChannel['secrets:get-storage-backend']()).toBe('kwallet');
    });

    it('returns basic_text on Linux when no keyring is available', () => {
      setPlatformAndArch('linux', 'x64');
      setSelectedStorageBackend('basic_text');

      expect(ipcHandlersByChannel['secrets:get-storage-backend']()).toBe('basic_text');
    });

    it('returns native on macOS/Windows when encryption is available', () => {
      setPlatformAndArch('darwin', 'arm64');
      setEncryptionAvailable(true);

      expect(ipcHandlersByChannel['secrets:get-storage-backend']()).toBe('native');
    });

    it('returns basic_text on macOS/Windows when encryption is not available', () => {
      setPlatformAndArch('darwin', 'arm64');
      setEncryptionAvailable(false);

      expect(ipcHandlersByChannel['secrets:get-storage-backend']()).toBe('basic_text');
    });
  });

  describe('secrets:save-unlock-password', () => {
    it('encrypts the password and writes it to the unlock password file', () => {
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      ipcHandlersByChannel['secrets:save-unlock-password']({}, 'correct horse battery staple');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/fake/home/.Ambrosia-POS/.unlock-key',
        expect.any(Buffer),
        { mode: 0o600 },
      );
    });
  });

  describe('secrets:clear-unlock-password', () => {
    it('removes the unlock password file when it exists', () => {
      fs.existsSync.mockReturnValue(true);
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      ipcHandlersByChannel['secrets:clear-unlock-password']();

      expect(fs.unlinkSync).toHaveBeenCalledWith('/fake/home/.Ambrosia-POS/.unlock-key');
    });

    it('does nothing when no unlock password file exists', () => {
      vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      ipcHandlersByChannel['secrets:clear-unlock-password']();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('notifications:admin-activity', () => {
    it('does not construct a notification when notifications are unsupported', () => {
      NotificationMock.isSupported.mockReturnValue(false);

      ipcListenersByChannel['notifications:admin-activity']({}, { title: 'New order' });

      expect(NotificationMock.createdInstances).toHaveLength(0);
    });

    it('normalizes the title with a fallback and shows the notification', () => {
      ipcListenersByChannel['notifications:admin-activity']({}, { body: 'Order #42 ready' });

      const [notification] = NotificationMock.createdInstances;
      expect(notification.options).toEqual({ title: 'Ambrosia', body: 'Order #42 ready', silent: false });
      expect(notification.show).toHaveBeenCalled();
    });

    it('falls back through title, fallbackActivityTitle, and systemBody for the body', () => {
      ipcListenersByChannel['notifications:admin-activity']({}, { fallbackActivityTitle: 'Fallback activity' });

      const [notification] = NotificationMock.createdInstances;
      expect(notification.options.body).toBe('Fallback activity');
    });

    it('truncates a title longer than 160 characters', () => {
      ipcListenersByChannel['notifications:admin-activity']({}, { systemTitle: 'x'.repeat(200) });

      const [notification] = NotificationMock.createdInstances;
      expect(notification.options.title).toHaveLength(160);
    });
  });
});

describe('single-instance lock', () => {
  async function loadFreshMainWithLock(lockAcquired) {
    return loadFreshMain((appMock) => {
      appMock.requestSingleInstanceLock.mockReturnValue(lockAcquired);
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('quits immediately when another instance already holds the lock', async () => {
    const appMock = await loadFreshMainWithLock(false);

    expect(appMock.quit).toHaveBeenCalled();
  });

  it('registers a second-instance listener when this is the only instance', async () => {
    const appMock = await loadFreshMainWithLock(true);

    expect(appMock.on).toHaveBeenCalledWith('second-instance', expect.any(Function));
  });
});

describe('Linux password-store backend', () => {
  async function loadFreshMainWithPlatform(platform, environmentVariableOverrides = {}) {
    setPlatformAndArch(platform, 'x64');
    delete process.env.KDE_FULL_SESSION;
    delete process.env.XDG_CURRENT_DESKTOP;
    Object.assign(process.env, environmentVariableOverrides);

    return loadFreshMain();
  }

  afterEach(() => {
    restorePlatformAndArch();
    delete process.env.KDE_FULL_SESSION;
    delete process.env.XDG_CURRENT_DESKTOP;
    vi.restoreAllMocks();
  });

  it('does not force a backend outside Linux', async () => {
    const appMock = await loadFreshMainWithPlatform('darwin');

    expect(appMock.commandLine.appendSwitch).not.toHaveBeenCalled();
  });

  it('forces gnome-libsecret on Linux when no KDE session is detected', async () => {
    const appMock = await loadFreshMainWithPlatform('linux');

    expect(appMock.commandLine.appendSwitch).toHaveBeenCalledWith('password-store', 'gnome-libsecret');
  });

  it('forces kwallet6 on Linux when KDE_FULL_SESSION is set', async () => {
    const appMock = await loadFreshMainWithPlatform('linux', { KDE_FULL_SESSION: 'true' });

    expect(appMock.commandLine.appendSwitch).toHaveBeenCalledWith('password-store', 'kwallet6');
  });

  it('forces kwallet6 on Linux when XDG_CURRENT_DESKTOP mentions KDE', async () => {
    const appMock = await loadFreshMainWithPlatform('linux', { XDG_CURRENT_DESKTOP: 'KDE' });

    expect(appMock.commandLine.appendSwitch).toHaveBeenCalledWith('password-store', 'kwallet6');
  });
});
