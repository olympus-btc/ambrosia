const fs = require('fs');
const path = require('path');

const { installElectronMock, setIsPackaged } = require('../../test-utils/electronMock.js');
const { createFakeSpawnedProcess, createFakeWriteStream } = require('../../test-utils/fakeChildProcess.js');
const { setPlatformAndArch, restorePlatformAndArch } = require('../../test-utils/platformMock.js');
const { installSpawnMock } = require('../../test-utils/spawnMock.js');
const { installTreeKillMock } = require('../../test-utils/treeKillMock.js');
const { healthCheck } = require('../../utils/healthCheck.js');
const { logger } = require('../../utils/logger.js');

let NextJsService;
let spawnMock;
let treeKillMock;

beforeAll(() => {
  installElectronMock();
  spawnMock = installSpawnMock();
  treeKillMock = installTreeKillMock();
  healthCheck.checkNextJs = vi.fn();
  NextJsService = require('../NextJsService.js').default;
});

let fakeSpawnedProcess;

beforeEach(() => {
  fakeSpawnedProcess = createFakeSpawnedProcess();
  setIsPackaged(false);
  delete process.env.NODE_ENV;
  delete process.resourcesPath;
  spawnMock.mockReset().mockReturnValue(fakeSpawnedProcess);
  treeKillMock.mockReset().mockImplementation((_pid, _signal, callback) => callback());
  healthCheck.checkNextJs.mockReset().mockResolvedValue(true);
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
  vi.spyOn(fs, 'createWriteStream').mockImplementation(createFakeWriteStream);
  vi.spyOn(logger, 'log').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  restorePlatformAndArch();
  vi.restoreAllMocks();
});

describe('constructor', () => {
  it('starts with no process, stopped status, and no port', () => {
    const nextJsService = new NextJsService();

    expect(nextJsService.getStatus()).toBe('stopped');
    expect(nextJsService.getPort()).toBe(null);
  });
});

describe('start', () => {
  it('throws when a process is already running', async () => {
    const nextJsService = new NextJsService();
    await nextJsService.start(3000);

    await expect(nextJsService.start(3000)).rejects.toThrow('Next.js service is already running');
  });

  it('creates the logs directory when it does not exist', async () => {
    fs.existsSync.mockReturnValue(false);
    const nextJsService = new NextJsService();

    await nextJsService.start(3000);

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('logs'), { recursive: true });
  });

  it('runs "npm run dev" in development mode', async () => {
    const nextJsService = new NextJsService();

    await nextJsService.start(3000);

    const [command, commandArguments] = spawnMock.mock.calls[0];
    expect(command).toBe('npm');
    expect(commandArguments).toEqual(['run', 'dev', '--', '-p', '3000']);
  });

  it('does not check for server.js in development mode', async () => {
    fs.existsSync.mockImplementation((checkedPath) => !String(checkedPath).endsWith('server.js'));
    const nextJsService = new NextJsService();

    await expect(nextJsService.start(3000)).resolves.toEqual(expect.objectContaining({ port: 3000 }));
  });

  it('runs the bundled Node.js binary against server.js in production mode', async () => {
    setIsPackaged(true);
    setPlatformAndArch('darwin', 'arm64');
    process.resourcesPath = '/fake/resources';
    const nextJsService = new NextJsService();

    await nextJsService.start(3000);

    const [command, commandArguments] = spawnMock.mock.calls[0];
    expect(command).toBe(path.join('/fake/resources', 'node', 'macos-arm64', 'bin', 'node'));
    expect(commandArguments).toEqual([expect.stringContaining('server.js')]);
  });

  it('throws when server.js is missing in production mode', async () => {
    setIsPackaged(true);
    process.resourcesPath = '/fake/resources';
    fs.existsSync.mockImplementation((checkedPath) => !String(checkedPath).endsWith('server.js'));
    const nextJsService = new NextJsService();

    await expect(nextJsService.start(3000)).rejects.toThrow('server.js not found at:');
  });

  it('throws when spawn returns a process with no pid', async () => {
    const spawnedProcessWithNoPid = createFakeSpawnedProcess();
    spawnedProcessWithNoPid.pid = undefined;
    spawnMock.mockReturnValue(spawnedProcessWithNoPid);
    const nextJsService = new NextJsService();

    await expect(nextJsService.start(3000)).rejects.toThrow('Failed to spawn Next.js process');
  });

  it('builds NEXT_PUBLIC_API_URL from the given backend host and port', async () => {
    const nextJsService = new NextJsService();

    await nextJsService.start(3000, { host: '127.0.0.1', port: '9154' });

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.NEXT_PUBLIC_API_URL).toBe('http://127.0.0.1:9154');
  });

  it('defaults the backend host and port when none are given', async () => {
    const nextJsService = new NextJsService();

    await nextJsService.start(3000);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.NEXT_PUBLIC_API_URL).toBe('http://localhost:9154');
  });

  it('defaults NODE_ENV to production when unset', async () => {
    const nextJsService = new NextJsService();

    await nextJsService.start(3000);

    const [, , spawnOptions] = spawnMock.mock.calls[0];
    expect(spawnOptions.env.NODE_ENV).toBe('production');
  });

  it('waits for Next.js to become healthy before resolving', async () => {
    const nextJsService = new NextJsService();

    const startedServiceInfo = await nextJsService.start(3000);

    expect(healthCheck.checkNextJs).toHaveBeenCalledWith(3000);
    expect(startedServiceInfo).toEqual({ port: 3000, url: 'http://localhost:3000' });
    expect(nextJsService.getStatus()).toBe('running');
  });

  it('stops the process and rethrows when the health check never succeeds', async () => {
    healthCheck.checkNextJs.mockRejectedValue(new Error('Timed out waiting for: http://localhost:3000/'));
    const nextJsService = new NextJsService();

    await expect(nextJsService.start(3000)).rejects.toThrow('Timed out waiting for: http://localhost:3000/');
    expect(nextJsService.getStatus()).toBe('stopped');
  });
});

describe('stop', () => {
  it('does nothing when there is no process to stop', async () => {
    const nextJsService = new NextJsService();

    await nextJsService.stop();

    expect(treeKillMock).not.toHaveBeenCalled();
  });

  it('resolves once SIGTERM succeeds', async () => {
    const nextJsService = new NextJsService();
    await nextJsService.start(3000);

    await nextJsService.stop();

    expect(treeKillMock).toHaveBeenCalledWith(fakeSpawnedProcess.pid, 'SIGTERM', expect.any(Function));
    expect(nextJsService.getStatus()).toBe('stopped');
  });

  it('falls back to SIGKILL when sending SIGTERM fails', async () => {
    treeKillMock.mockImplementation((_pid, signal, callback) => {
      if (signal === 'SIGTERM') callback(new Error('no such process'));
      else callback();
    });
    const nextJsService = new NextJsService();
    await nextJsService.start(3000);

    await nextJsService.stop();

    expect(treeKillMock).toHaveBeenCalledWith(fakeSpawnedProcess.pid, 'SIGKILL', expect.any(Function));
  });

  it('force-kills with SIGKILL when SIGTERM never calls back before the timeout', async () => {
    vi.useFakeTimers();
    treeKillMock.mockImplementation((_pid, signal, callback) => {
      if (signal === 'SIGKILL') callback();
    });
    const nextJsService = new NextJsService();
    await nextJsService.start(3000);

    const stopPromise = nextJsService.stop();
    await vi.advanceTimersByTimeAsync(5000);
    await stopPromise;

    expect(treeKillMock).toHaveBeenCalledWith(fakeSpawnedProcess.pid, 'SIGKILL', expect.any(Function));
    vi.useRealTimers();
  });
});

describe('cleanup', () => {
  it('resets process, status, and closes the log stream', async () => {
    const nextJsService = new NextJsService();
    await nextJsService.start(3000);
    const logStreamEndSpy = nextJsService.logStream.end;

    nextJsService.cleanup();

    expect(nextJsService.getStatus()).toBe('stopped');
    expect(logStreamEndSpy).toHaveBeenCalled();
  });
});

describe('getUrl', () => {
  it('returns null before a port has been set', () => {
    const nextJsService = new NextJsService();

    expect(nextJsService.getUrl()).toBe(null);
  });

  it('returns the localhost URL for the current port once started', async () => {
    const nextJsService = new NextJsService();

    await nextJsService.start(3000);

    expect(nextJsService.getUrl()).toBe('http://localhost:3000');
  });
});
