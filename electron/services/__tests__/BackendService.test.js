const fs = require('fs');

const { installElectronMock } = require('../../test-utils/electronMock.js');
const { createFakeSpawnedProcess, createFakeWriteStream } = require('../../test-utils/fakeChildProcess.js');
const { installSpawnMock } = require('../../test-utils/spawnMock.js');
const { installTreeKillMock } = require('../../test-utils/treeKillMock.js');
const { healthCheck } = require('../../utils/healthCheck.js');
const { logger } = require('../../utils/logger.js');

let BackendService;
let unlockPasswordStore;
let serverSecretStore;
let phoenixdCredentialsStore;
let spawnMock;
let treeKillMock;

beforeAll(() => {
  installElectronMock();
  spawnMock = installSpawnMock();
  treeKillMock = installTreeKillMock();
  healthCheck.checkBackend = vi.fn();
  ({ unlockPasswordStore } = require('../UnlockPasswordStore.js'));
  unlockPasswordStore.read = vi.fn();
  ({ serverSecretStore } = require('../ServerSecretStore.js'));
  serverSecretStore.read = vi.fn();
  ({ phoenixdCredentialsStore } = require('../PhoenixdCredentialsStore.js'));
  phoenixdCredentialsStore.readHttpPassword = vi.fn();
  BackendService = require('../BackendService.js').default;
});

let fakeSpawnedProcess;

const backendConfig = { phoenixdPort: 9740, webhookSecret: 'webhook-secret' };

beforeEach(() => {
  fakeSpawnedProcess = createFakeSpawnedProcess();
  spawnMock.mockReset().mockReturnValue(fakeSpawnedProcess);
  treeKillMock.mockReset().mockImplementation((_pid, _signal, treeKillCallback) => {
    treeKillCallback();
    fakeSpawnedProcess.emit('exit', 0);
  });
  healthCheck.checkBackend.mockReset().mockResolvedValue(true);
  unlockPasswordStore.read.mockReset().mockReturnValue(null);
  serverSecretStore.read.mockReset().mockReturnValue(null);
  phoenixdCredentialsStore.readHttpPassword.mockReset().mockReturnValue(null);
  vi.spyOn(fs, 'readdirSync').mockReturnValue(['ambrosia-0.8.0-beta.jar']);
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
  vi.spyOn(fs, 'createWriteStream').mockImplementation(createFakeWriteStream);
  vi.spyOn(logger, 'log').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('constructor', () => {
  it('starts with no process, stopped status, and no port', () => {
    const backendService = new BackendService();

    expect(backendService.getStatus()).toBe('stopped');
    expect(backendService.getPort()).toBe(null);
  });
});

describe('start', () => {
  it('throws when a process is already running', async () => {
    const backendService = new BackendService();
    await backendService.start(9154, backendConfig);

    await expect(backendService.start(9154, backendConfig)).rejects.toThrow('Backend service is already running');
  });

  it('creates the logs directory when it does not exist', async () => {
    fs.existsSync.mockReturnValue(false);
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('logs'), { recursive: true });
  });

  it('does not create the logs directory when it already exists', async () => {
    fs.existsSync.mockReturnValue(true);
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('spawns java with the jar path and port command arguments', async () => {
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [javaPath, commandArguments] = spawnMock.mock.calls[0];
    expect(javaPath).toBe('java');
    expect(commandArguments).toEqual(expect.arrayContaining([
      '-jar',
      '--http-bind-ip=127.0.0.1',
      '--http-bind-port=9154',
      '--phoenixd-url=http://localhost:9740',
    ]));
  });

  it('omits the phoenixd-url command argument when a remote phoenixd node is configured', async () => {
    const backendService = new BackendService();

    await backendService.start(9154, { ...backendConfig, phoenixdRemoteConfigured: true });

    const [, commandArguments] = spawnMock.mock.calls[0];
    expect(commandArguments).not.toEqual(expect.arrayContaining([expect.stringContaining('--phoenixd-url')]));
  });

  it('passes the webhook secret as an env var', async () => {
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.PHOENIXD_WEBHOOK_SECRET).toBe('webhook-secret');
  });

  it('sets PHOENIXD_PASSWORD when a phoenixd http-password was saved', async () => {
    phoenixdCredentialsStore.readHttpPassword.mockReturnValue('saved-phoenixd-password');
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.PHOENIXD_PASSWORD).toBe('saved-phoenixd-password');
  });

  it('omits PHOENIXD_PASSWORD when no phoenixd http-password was saved', async () => {
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.PHOENIXD_PASSWORD).toBeUndefined();
  });

  it('sets AMBROSIA_SECRET when a server secret was saved', async () => {
    serverSecretStore.read.mockReturnValue('saved-server-secret');
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.AMBROSIA_SECRET).toBe('saved-server-secret');
  });

  it('omits AMBROSIA_SECRET when no server secret was saved', async () => {
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.AMBROSIA_SECRET).toBeUndefined();
  });

  it('sets AUTO_UNLOCK_PASSWORD when a password was saved', async () => {
    unlockPasswordStore.read.mockReturnValue('saved-unlock-password');
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.AUTO_UNLOCK_PASSWORD).toBe('saved-unlock-password');
  });

  it('omits AUTO_UNLOCK_PASSWORD when no password was saved', async () => {
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.AUTO_UNLOCK_PASSWORD).toBeUndefined();
  });

  it('strips JAVA_* env vars before spawning', async () => {
    process.env.JAVA_TOOL_OPTIONS = '-Xmx512m';
    const backendService = new BackendService();

    await backendService.start(9154, backendConfig);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.JAVA_TOOL_OPTIONS).toBeUndefined();

    delete process.env.JAVA_TOOL_OPTIONS;
  });

  it('waits for the backend to become healthy before resolving', async () => {
    const backendService = new BackendService();

    const startedServiceInfo = await backendService.start(9154, backendConfig);

    expect(healthCheck.checkBackend).toHaveBeenCalledWith(9154);
    expect(startedServiceInfo).toEqual({ port: 9154 });
    expect(backendService.getStatus()).toBe('running');
  });

  it('stops the process and rethrows when the health check never succeeds', async () => {
    healthCheck.checkBackend.mockRejectedValue(new Error('Timed out waiting for: http://localhost:9154/api/health'));
    const backendService = new BackendService();

    await expect(backendService.start(9154, backendConfig))
      .rejects.toThrow('Timed out waiting for: http://localhost:9154/api/health');
    expect(backendService.getStatus()).toBe('stopped');
  });
});

describe('stop', () => {
  it('does nothing when there is no process to stop', async () => {
    const backendService = new BackendService();

    await backendService.stop();

    expect(treeKillMock).not.toHaveBeenCalled();
  });

  it('resolves once SIGTERM succeeds', async () => {
    const backendService = new BackendService();
    await backendService.start(9154, backendConfig);

    await backendService.stop();

    expect(treeKillMock).toHaveBeenCalledWith(fakeSpawnedProcess.pid, 'SIGTERM', expect.any(Function));
    expect(backendService.getStatus()).toBe('stopped');
  });

  it('falls back to SIGKILL when sending SIGTERM fails', async () => {
    treeKillMock.mockImplementation((_pid, signal, treeKillCallback) => {
      if (signal === 'SIGTERM') {
        treeKillCallback(new Error('no such process'));
      } else {
        treeKillCallback();
      }
    });
    const backendService = new BackendService();
    await backendService.start(9154, backendConfig);

    await backendService.stop();

    expect(treeKillMock).toHaveBeenCalledWith(fakeSpawnedProcess.pid, 'SIGKILL', expect.any(Function));
  });

  it('force-kills with SIGKILL when SIGTERM never calls back before the timeout', async () => {
    vi.useFakeTimers();
    treeKillMock.mockImplementation((_pid, signal, treeKillCallback) => {
      if (signal === 'SIGKILL') treeKillCallback();
    });
    const backendService = new BackendService();
    await backendService.start(9154, backendConfig);

    const stopPromise = backendService.stop();
    await vi.advanceTimersByTimeAsync(10000);
    await stopPromise;

    expect(treeKillMock).toHaveBeenCalledWith(fakeSpawnedProcess.pid, 'SIGKILL', expect.any(Function));
    vi.useRealTimers();
  });

  it('does not resolve just because tree-kill confirmed the signal was sent — waits for the process to actually exit', async () => {
    treeKillMock.mockImplementation(() => {});
    const backendService = new BackendService();
    await backendService.start(9154, backendConfig);

    let stopResolved = false;
    const stopPromise = backendService.stop().then(() => {
      stopResolved = true;
    });

    const [, , treeKillCallback] = treeKillMock.mock.calls[0];
    treeKillCallback();
    await Promise.resolve();
    await Promise.resolve();
    expect(stopResolved).toBe(false);

    fakeSpawnedProcess.emit('exit', 0);
    await stopPromise;
    expect(stopResolved).toBe(true);
  });
});

describe('cleanup', () => {
  it('resets process, status, and closes the log stream', async () => {
    const backendService = new BackendService();
    await backendService.start(9154, backendConfig);
    const logStreamEndSpy = backendService.logStream.end;

    backendService.cleanup();

    expect(backendService.getStatus()).toBe('stopped');
    expect(logStreamEndSpy).toHaveBeenCalled();
  });
});
