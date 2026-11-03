const { PhoenixdServiceMock, BackendServiceMock, NextJsServiceMock } = vi.hoisted(() => {
  function createFakeServiceClass() {
    const createdInstances = [];

    function FakeService() {
      const instance = {
        start: vi.fn().mockResolvedValue({ port: 0, url: 'http://localhost:0' }),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue('stopped'),
        getPort: vi.fn().mockReturnValue(null),
      };
      createdInstances.push(instance);
      return instance;
    }

    const FakeServiceClass = vi.fn(FakeService);
    FakeServiceClass.createdInstances = createdInstances;
    return FakeServiceClass;
  }

  return {
    PhoenixdServiceMock: createFakeServiceClass(),
    BackendServiceMock: createFakeServiceClass(),
    NextJsServiceMock: createFakeServiceClass(),
  };
});

vi.mock('../PhoenixdService.js', () => ({ default: PhoenixdServiceMock }));
vi.mock('../BackendService.js', () => ({ default: BackendServiceMock }));
vi.mock('../NextJsService.js', () => ({ default: NextJsServiceMock }));

const { installElectronMock, setIsPackaged } = require('../../test-utils/electronMock.js');

let healthCheck;
let logger;
let ServiceManager;
let configurationBootstrap;
let portAllocator;

beforeAll(async () => {
  installElectronMock();
  ({ healthCheck } = await import('../../utils/healthCheck.js'));
  ({ logger } = await import('../../utils/logger.js'));
  ({ configurationBootstrap } = await import('../ConfigurationBootstrap.js'));
  ({ portAllocator } = await import('../../utils/portAllocator.js'));
  healthCheck.isPhoenixdRunning = vi.fn();
  healthCheck.isBackendRunning = vi.fn();
  configurationBootstrap.ensureConfigurations = vi.fn();
  portAllocator.allocatePorts = vi.fn();
  ({ default: ServiceManager } = await import('../ServiceManager.js'));
});

const allocatedPorts = { phoenixd: 9740, backend: 9154, nextjs: 3000 };

function buildConfigs(ambrosiaOverrides = {}) {
  return {
    ambrosia: { 'http-bind-port': '9154', ...ambrosiaOverrides },
    phoenix: { 'webhook-secret': 'webhook-secret' },
  };
}

beforeEach(() => {
  setIsPackaged(true);
  portAllocator.allocatePorts.mockReset().mockResolvedValue({ ...allocatedPorts });
  configurationBootstrap.ensureConfigurations.mockReset().mockResolvedValue(buildConfigs());
  healthCheck.isPhoenixdRunning.mockReset().mockResolvedValue(false);
  healthCheck.isBackendRunning.mockReset().mockResolvedValue(false);
  PhoenixdServiceMock.mockClear();
  BackendServiceMock.mockClear();
  NextJsServiceMock.mockClear();
  PhoenixdServiceMock.createdInstances.length = 0;
  BackendServiceMock.createdInstances.length = 0;
  NextJsServiceMock.createdInstances.length = 0;
  vi.spyOn(logger, 'log').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('constructor', () => {
  it('reflects isDevelopment() as developmentMode when no override is given', () => {
    setIsPackaged(false);

    const serviceManager = new ServiceManager();

    expect(serviceManager.isDevelopmentMode()).toBe(true);
  });

  it('starts with no external services', () => {
    const serviceManager = new ServiceManager();

    expect(serviceManager.getServiceStatuses()).toEqual({ phoenixd: 'stopped', backend: 'stopped', nextjs: 'stopped' });
  });
});

describe('_startAll in development mode', () => {
  it('only starts Next.js, using the backend port as the proxy target', async () => {
    setIsPackaged(false);
    const serviceManager = new ServiceManager();

    await serviceManager.startAll();

    expect(PhoenixdServiceMock.createdInstances[0].start).not.toHaveBeenCalled();
    expect(BackendServiceMock.createdInstances[0].start).not.toHaveBeenCalled();
    expect(NextJsServiceMock.createdInstances[0].start).toHaveBeenCalledWith(3000, { host: 'localhost', port: 9154 });
  });

  it('returns the Next.js url', async () => {
    function createRunningNextJsService() {
      return {
        start: vi.fn().mockResolvedValue({ port: 3000, url: 'http://localhost:3000' }),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue('running'),
        getPort: vi.fn().mockReturnValue(3000),
      };
    }

    setIsPackaged(false);
    NextJsServiceMock.mockImplementationOnce(createRunningNextJsService);
    const serviceManager = new ServiceManager();

    await expect(serviceManager.startAll()).resolves.toBe('http://localhost:3000');
  });
});

describe('_startAll in production mode', () => {
  it('starts phoenixd, backend, and nextjs in order when none are external', async () => {
    const serviceManager = new ServiceManager();

    await serviceManager.startAll();

    expect(PhoenixdServiceMock.createdInstances[0].start).toHaveBeenCalledWith(9740);
    expect(BackendServiceMock.createdInstances[0].start).toHaveBeenCalledWith(9154, expect.objectContaining({
      phoenixdPort: 9740,
      webhookSecret: 'webhook-secret',
      phoenixdRemoteConfigured: false,
    }));
    expect(NextJsServiceMock.createdInstances[0].start).toHaveBeenCalledWith(3000, { host: '127.0.0.1', port: 9154 });
  });

  it('skips starting phoenixd when an NWC wallet is configured', async () => {
    configurationBootstrap.ensureConfigurations.mockResolvedValue(buildConfigs({ 'nwc-uri': 'nostr+walletconnect://...' }));
    const serviceManager = new ServiceManager();

    await serviceManager.startAll();

    expect(PhoenixdServiceMock.createdInstances[0].start).not.toHaveBeenCalled();
  });

  it('skips starting phoenixd and marks it external when a remote node is configured', async () => {
    configurationBootstrap.ensureConfigurations.mockResolvedValue(buildConfigs({ 'phoenixd-remote': 'true' }));
    const serviceManager = new ServiceManager();

    await serviceManager.startAll();

    expect(PhoenixdServiceMock.createdInstances[0].start).not.toHaveBeenCalled();
    expect(BackendServiceMock.createdInstances[0].start).toHaveBeenCalledWith(9154, expect.objectContaining({ phoenixdRemoteConfigured: true }));
  });

  it('reuses an already-running phoenixd instead of starting a new one', async () => {
    healthCheck.isPhoenixdRunning.mockResolvedValue(true);
    const serviceManager = new ServiceManager();

    await serviceManager.startAll();

    expect(PhoenixdServiceMock.createdInstances[0].start).not.toHaveBeenCalled();
    expect(serviceManager.getPorts().phoenixd).toBe(null);
  });

  it('reuses an already-running backend instead of starting a new one', async () => {
    healthCheck.isBackendRunning.mockResolvedValue(true);
    const serviceManager = new ServiceManager();

    await serviceManager.startAll();

    expect(BackendServiceMock.createdInstances[0].start).not.toHaveBeenCalled();
  });

  it('emits service:started for each service and all:started at the end', async () => {
    const serviceManager = new ServiceManager();
    const startedServiceNames = [];
    serviceManager.on('service:started', ({ service }) => startedServiceNames.push(service));
    const allStarted = vi.fn();
    serviceManager.on('all:started', allStarted);

    await serviceManager.startAll();

    expect(startedServiceNames).toEqual(['phoenixd', 'backend', 'nextjs']);
    expect(allStarted).toHaveBeenCalledTimes(1);
  });

  it('stops every service and rethrows when a step fails', async () => {
    function createFailingBackendService() {
      return {
        start: vi.fn().mockRejectedValue(new Error('backend failed to start')),
        stop: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue('error'),
        getPort: vi.fn().mockReturnValue(null),
      };
    }

    BackendServiceMock.mockImplementationOnce(createFailingBackendService);
    const serviceManager = new ServiceManager();

    await expect(serviceManager.startAll()).rejects.toThrow('backend failed to start');

    expect(NextJsServiceMock.createdInstances[0].stop).toHaveBeenCalled();
    expect(PhoenixdServiceMock.createdInstances[0].stop).toHaveBeenCalled();
  });

  it('times out after 2 minutes if startup never resolves', async () => {
    vi.useFakeTimers();
    portAllocator.allocatePorts.mockReturnValue(new Promise(() => {}));
    const serviceManager = new ServiceManager();

    const startAllPromise = serviceManager.startAll();
    const startAllRejection = expect(startAllPromise).rejects.toThrow('Startup timed out after 2 minutes');
    await vi.advanceTimersByTimeAsync(120000);

    await startAllRejection;
    vi.useRealTimers();
  });
});

describe('stopAll', () => {
  it('always stops Next.js, even in development mode', async () => {
    setIsPackaged(false);
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await serviceManager.stopAll();

    expect(NextJsServiceMock.createdInstances[0].stop).toHaveBeenCalled();
  });

  it('does not stop phoenixd or backend in development mode', async () => {
    setIsPackaged(false);
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await serviceManager.stopAll();

    expect(PhoenixdServiceMock.createdInstances[0].stop).not.toHaveBeenCalled();
    expect(BackendServiceMock.createdInstances[0].stop).not.toHaveBeenCalled();
  });

  it('does not stop a service that was marked external', async () => {
    healthCheck.isPhoenixdRunning.mockResolvedValue(true);
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await serviceManager.stopAll();

    expect(PhoenixdServiceMock.createdInstances[0].stop).not.toHaveBeenCalled();
    expect(BackendServiceMock.createdInstances[0].stop).toHaveBeenCalled();
  });

  it('still attempts to stop the other services when one stop() rejects', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();
    NextJsServiceMock.createdInstances[0].stop.mockRejectedValue(new Error('nextjs stop failed'));

    await serviceManager.stopAll();

    expect(BackendServiceMock.createdInstances[0].stop).toHaveBeenCalled();
    expect(PhoenixdServiceMock.createdInstances[0].stop).toHaveBeenCalled();
  });

  it('emits all:stopped', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();
    const allStopped = vi.fn();
    serviceManager.on('all:stopped', allStopped);

    await serviceManager.stopAll();

    expect(allStopped).toHaveBeenCalledTimes(1);
  });
});

describe('restartService', () => {
  it('does nothing when the target service is external', async () => {
    healthCheck.isPhoenixdRunning.mockResolvedValue(true);
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await serviceManager.restartService('phoenixd');

    expect(PhoenixdServiceMock.createdInstances[0].start).not.toHaveBeenCalled();
  });

  it('stops and starts phoenixd, clearing its external flag', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await serviceManager.restartService('phoenixd');

    expect(PhoenixdServiceMock.createdInstances[0].stop).toHaveBeenCalled();
    expect(PhoenixdServiceMock.createdInstances[0].start).toHaveBeenCalledTimes(2);
  });

  it('stops and starts the backend with the current phoenixd config', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await serviceManager.restartService('backend');

    expect(BackendServiceMock.createdInstances[0].stop).toHaveBeenCalled();
    expect(BackendServiceMock.createdInstances[0].start).toHaveBeenLastCalledWith(9154, expect.objectContaining({
      webhookSecret: 'webhook-secret',
    }));
  });

  it('stops and starts nextjs', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await serviceManager.restartService('nextjs');

    expect(NextJsServiceMock.createdInstances[0].stop).toHaveBeenCalled();
    expect(NextJsServiceMock.createdInstances[0].start).toHaveBeenCalledTimes(2);
  });

  it('throws for an unknown service name', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();

    await expect(serviceManager.restartService('unknown')).rejects.toThrow('Unknown service: unknown');
  });

  it('emits service:restarted on success', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();
    const restarted = vi.fn();
    serviceManager.on('service:restarted', restarted);

    await serviceManager.restartService('nextjs');

    expect(restarted).toHaveBeenCalledWith({ service: 'nextjs' });
  });

  it('emits service:error and rethrows on failure', async () => {
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();
    NextJsServiceMock.createdInstances[0].start.mockRejectedValueOnce(new Error('restart failed'));
    const serviceErrorListener = vi.fn();
    serviceManager.on('service:error', serviceErrorListener);

    await expect(serviceManager.restartService('nextjs')).rejects.toThrow('restart failed');
    expect(serviceErrorListener).toHaveBeenCalledWith({ service: 'nextjs', serviceError: expect.any(Error) });
  });
});

describe('health monitor', () => {
  it('emits service:error when a non-external service reports an error status', async () => {
    vi.useFakeTimers();
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();
    BackendServiceMock.createdInstances[0].getStatus.mockReturnValue('error');
    const serviceErrorListener = vi.fn();
    serviceManager.on('service:error', serviceErrorListener);

    await vi.advanceTimersByTimeAsync(30000);

    expect(serviceErrorListener).toHaveBeenCalledWith({ service: 'backend', serviceError: expect.any(Error) });
    vi.useRealTimers();
  });

  it('does not monitor a service marked external', async () => {
    healthCheck.isPhoenixdRunning.mockResolvedValue(true);
    vi.useFakeTimers();
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();
    PhoenixdServiceMock.createdInstances[0].getStatus.mockReturnValue('error');
    const serviceErrorListener = vi.fn();
    serviceManager.on('service:error', serviceErrorListener);

    await vi.advanceTimersByTimeAsync(30000);

    expect(serviceErrorListener).not.toHaveBeenCalledWith(expect.objectContaining({ service: 'phoenixd' }));
    vi.useRealTimers();
  });

  it('stops monitoring once stopAll runs', async () => {
    vi.useFakeTimers();
    const serviceManager = new ServiceManager();
    await serviceManager.startAll();
    await serviceManager.stopAll();
    BackendServiceMock.createdInstances[0].getStatus.mockReturnValue('error');
    const serviceErrorListener = vi.fn();
    serviceManager.on('service:error', serviceErrorListener);

    await vi.advanceTimersByTimeAsync(30000);

    expect(serviceErrorListener).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
