const { contextBridgeMock, ipcRendererMock } = vi.hoisted(() => ({
  contextBridgeMock: { exposeInMainWorld: vi.fn() },
  ipcRendererMock: {
    send: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  contextBridge: contextBridgeMock,
  ipcRenderer: ipcRendererMock,
}));

let exposedChannelName;
let exposedElectronApi;

beforeAll(async () => {
  await import('../preload.entry.js');
  [exposedChannelName, exposedElectronApi] = contextBridgeMock.exposeInMainWorld.mock.calls[0];
});

beforeEach(() => {
  contextBridgeMock.exposeInMainWorld.mockClear();
  ipcRendererMock.send.mockClear();
  ipcRendererMock.invoke.mockClear();
  ipcRendererMock.on.mockClear();
  ipcRendererMock.once.mockClear();
  ipcRendererMock.removeListener.mockClear();
});

describe('exposeInMainWorld', () => {
  it('exposes the API under the "electron" key', () => {
    expect(exposedChannelName).toBe('electron');
  });
});

describe('platform and versions', () => {
  it('exposes the current process platform and versions', () => {
    expect(exposedElectronApi.platform).toBe(process.platform);
    expect(exposedElectronApi.versions).toEqual({
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
    });
  });
});

describe('ipc.send', () => {
  it('forwards a whitelisted channel to ipcRenderer.send', () => {
    exposedElectronApi.ipc.send('ping', 'payload');

    expect(ipcRendererMock.send).toHaveBeenCalledWith('ping', 'payload');
  });

  it('does not forward a channel outside the send whitelist', () => {
    exposedElectronApi.ipc.send('not-whitelisted', 'payload');

    expect(ipcRendererMock.send).not.toHaveBeenCalled();
  });
});

describe('ipc.invoke', () => {
  it('forwards a whitelisted channel to ipcRenderer.invoke', () => {
    ipcRendererMock.invoke.mockResolvedValue('result');

    exposedElectronApi.ipc.invoke('services:get-statuses');

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('services:get-statuses');
  });

  it('rejects with an Invalid channel error outside the invoke whitelist', async () => {
    await expect(exposedElectronApi.ipc.invoke('not-whitelisted')).rejects.toThrow('Invalid channel: not-whitelisted');
    expect(ipcRendererMock.invoke).not.toHaveBeenCalled();
  });

  it('passes through string, number, and boolean arguments unchanged', () => {
    ipcRendererMock.invoke.mockResolvedValue(undefined);

    exposedElectronApi.ipc.invoke('services:restart', 'backend', 3, true);

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('services:restart', 'backend', 3, true);
  });

  it('drops a function argument, replacing it with null', () => {
    ipcRendererMock.invoke.mockResolvedValue(undefined);

    exposedElectronApi.ipc.invoke('services:restart', () => {});

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('services:restart', null);
  });

  it('sanitizes a function nested inside an object argument, keeping the other keys', () => {
    ipcRendererMock.invoke.mockResolvedValue(undefined);

    exposedElectronApi.ipc.invoke('phoenixd:set-auto-liquidity', { value: 'off', onDone: () => {} });

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('phoenixd:set-auto-liquidity', { value: 'off', onDone: null });
  });

  it('sanitizes a function nested inside an array argument', () => {
    ipcRendererMock.invoke.mockResolvedValue(undefined);

    exposedElectronApi.ipc.invoke('services:restart', ['backend', () => {}]);

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('services:restart', ['backend', null]);
  });

  it('passes through null and undefined unchanged', () => {
    ipcRendererMock.invoke.mockResolvedValue(undefined);

    exposedElectronApi.ipc.invoke('services:restart', null, undefined);

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('services:restart', null, undefined);
  });
});

describe('ipc.on', () => {
  it('registers a listener for a whitelisted receive channel', () => {
    const callback = vi.fn();

    exposedElectronApi.ipc.on('pong', callback);

    expect(ipcRendererMock.on).toHaveBeenCalledWith('pong', expect.any(Function));
  });

  it('does not register a listener outside the receive whitelist', () => {
    exposedElectronApi.ipc.on('not-whitelisted', vi.fn());

    expect(ipcRendererMock.on).not.toHaveBeenCalled();
  });

  it('strips the IPC event object before forwarding to the callback', () => {
    const callback = vi.fn();

    exposedElectronApi.ipc.on('pong', callback);
    const registeredListener = ipcRendererMock.on.mock.calls[0][1];
    registeredListener({ senderFrame: {} }, 'arg1', 'arg2');

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('ipc.once', () => {
  it('registers a one-time listener for a whitelisted receive channel', () => {
    exposedElectronApi.ipc.once('server-status', vi.fn());

    expect(ipcRendererMock.once).toHaveBeenCalledWith('server-status', expect.any(Function));
  });

  it('does not register a one-time listener outside the receive whitelist', () => {
    exposedElectronApi.ipc.once('not-whitelisted', vi.fn());

    expect(ipcRendererMock.once).not.toHaveBeenCalled();
  });
});

describe('ipc.removeListener', () => {
  it('forwards removal for a whitelisted receive channel', () => {
    const callback = vi.fn();

    exposedElectronApi.ipc.removeListener('update:available', callback);

    expect(ipcRendererMock.removeListener).toHaveBeenCalledWith('update:available', callback);
  });

  it('does not forward removal outside the receive whitelist', () => {
    exposedElectronApi.ipc.removeListener('not-whitelisted', vi.fn());

    expect(ipcRendererMock.removeListener).not.toHaveBeenCalled();
  });
});
