const { findFreePortMock } = vi.hoisted(() => ({
  findFreePortMock: vi.fn(),
}));

vi.mock('find-free-port', () => ({
  default: findFreePortMock,
}));

const { installElectronMock, setIsPackaged, resetElectronMock } = require('../../test-utils/electronMock.js');

let portAllocator;
let DEFAULT_PORTS;
let logger;

beforeAll(async () => {
  installElectronMock();
  ({ portAllocator, DEFAULT_PORTS } = await import('../portAllocator.js'));
  ({ logger } = await import('../logger.js'));
});

beforeEach(() => {
  resetElectronMock();
  findFreePortMock.mockReset();
  vi.spyOn(logger, 'log').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DEFAULT_PORTS', () => {
  it('exposes the default phoenixd, backend, and nextjs ports', () => {
    expect(DEFAULT_PORTS).toEqual({
      phoenixd: 9740,
      backend: 9154,
      nextjs: 3000,
    });
  });
});

describe('allocatePorts', () => {
  it('returns the default ports in development without calling findFreePort', async () => {
    setIsPackaged(false);

    const allocatedPorts = await portAllocator.allocatePorts();

    expect(allocatedPorts).toEqual({ phoenixd: 9740, backend: 9154, nextjs: 3000 });
    expect(findFreePortMock).not.toHaveBeenCalled();
  });

  it('returns dynamically allocated ports in production', async () => {
    setIsPackaged(true);
    findFreePortMock
      .mockResolvedValueOnce([9741])
      .mockResolvedValueOnce([9155])
      .mockResolvedValueOnce([3001]);

    const allocatedPorts = await portAllocator.allocatePorts();

    expect(allocatedPorts).toEqual({ phoenixd: 9741, backend: 9155, nextjs: 3001 });
  });

  it('requests each port within its documented range', async () => {
    setIsPackaged(true);
    findFreePortMock
      .mockResolvedValueOnce([9741])
      .mockResolvedValueOnce([9155])
      .mockResolvedValueOnce([3001]);

    await portAllocator.allocatePorts();

    expect(findFreePortMock).toHaveBeenNthCalledWith(1, 9740, 9800);
    expect(findFreePortMock).toHaveBeenNthCalledWith(2, 9154, 9200);
    expect(findFreePortMock).toHaveBeenNthCalledWith(3, 3000, 3100);
  });

  it('falls back to the default ports when dynamic allocation fails', async () => {
    setIsPackaged(true);
    findFreePortMock.mockRejectedValueOnce(new Error('no free port available'));

    const allocatedPorts = await portAllocator.allocatePorts();

    expect(allocatedPorts).toEqual({ phoenixd: 9740, backend: 9154, nextjs: 3000 });
  });

  it('warns when falling back to the default ports', async () => {
    setIsPackaged(true);
    findFreePortMock.mockRejectedValueOnce(new Error('no free port available'));

    await portAllocator.allocatePorts();

    expect(logger.warn).toHaveBeenCalledWith(
      '[PortAllocator] Dynamic allocation failed, using defaults:',
      'no free port available',
    );
  });
});
