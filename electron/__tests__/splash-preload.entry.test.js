const { contextBridgeMock, ipcRendererMock } = vi.hoisted(() => ({
  contextBridgeMock: { exposeInMainWorld: vi.fn() },
  ipcRendererMock: { on: vi.fn(), removeListener: vi.fn() },
}));

vi.mock('electron', () => ({
  contextBridge: contextBridgeMock,
  ipcRenderer: ipcRendererMock,
}));

let exposedChannelName;
let exposedSplashBridge;

beforeAll(async () => {
  await import('../splash-preload.entry.js');
  [exposedChannelName, exposedSplashBridge] = contextBridgeMock.exposeInMainWorld.mock.calls[0];
});

beforeEach(() => {
  contextBridgeMock.exposeInMainWorld.mockClear();
  ipcRendererMock.on.mockClear();
  ipcRendererMock.removeListener.mockClear();
});

describe('exposeInMainWorld', () => {
  it('exposes the API under the "splashBridge" key', () => {
    expect(exposedChannelName).toBe('splashBridge');
  });
});

describe('on', () => {
  it('registers a listener for a whitelisted splash channel', () => {
    exposedSplashBridge.on('splash:update', vi.fn());

    expect(ipcRendererMock.on).toHaveBeenCalledWith('splash:update', expect.any(Function));
  });

  it('does not register a listener outside the splash whitelist', () => {
    exposedSplashBridge.on('not-whitelisted', vi.fn());

    expect(ipcRendererMock.on).not.toHaveBeenCalled();
  });

  it('returns a no-op unsubscribe function outside the splash whitelist', () => {
    const unsubscribe = exposedSplashBridge.on('not-whitelisted', vi.fn());

    expect(() => unsubscribe()).not.toThrow();
    expect(ipcRendererMock.removeListener).not.toHaveBeenCalled();
  });

  it('strips the IPC event object before forwarding data to the callback', () => {
    const callback = vi.fn();

    exposedSplashBridge.on('splash:update', callback);
    const registeredListener = ipcRendererMock.on.mock.calls[0][1];
    registeredListener({ senderFrame: {} }, { progress: 50 });

    expect(callback).toHaveBeenCalledWith({ progress: 50 });
  });

  it('returns an unsubscribe function that removes the same listener that was registered', () => {
    const unsubscribe = exposedSplashBridge.on('splash:update', vi.fn());
    const registeredListener = ipcRendererMock.on.mock.calls[0][1];

    unsubscribe();

    expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('splash:update', registeredListener);
  });
});
