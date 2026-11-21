import { act, renderHook, waitFor } from "@testing-library/react";

import { changeServerLogLevel, getServerLogLevel } from "@/services/logsService";

import { SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL, useServerLogLevel } from "../useServerLogLevel";

jest.mock("@/services/logsService", () => ({
  getServerLogLevel: jest.fn(),
  changeServerLogLevel: jest.fn(),
}));

let mockIsElectron = false;
jest.mock("@/lib/isElectron", () => ({
  get isElectron() {
    return mockIsElectron;
  },
}));

describe("useServerLogLevel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsElectron = false;
    delete window.electron;
  });

  async function renderLoadedServerLogLevelHook() {
    getServerLogLevel.mockResolvedValueOnce("INFO");
    const renderedServerLogLevelHook = renderHook(() => useServerLogLevel());
    await waitFor(() => expect(renderedServerLogLevelHook.result.current.serverLogLevel).toBe("INFO"));
    return renderedServerLogLevelHook;
  }

  it("loads the current server log level", async () => {
    await renderLoadedServerLogLevelHook();

    expect(getServerLogLevel).toHaveBeenCalled();
  });

  it("updates the server log level without notifying a desktop app in the browser", async () => {
    const renderedServerLogLevelHook = await renderLoadedServerLogLevelHook();
    changeServerLogLevel.mockResolvedValueOnce("DEBUG");

    let serverLogLevelUpdated;
    await act(async () => {
      serverLogLevelUpdated = await renderedServerLogLevelHook.result.current.updateServerLogLevel("DEBUG");
    });

    expect(serverLogLevelUpdated).toBe(true);
    expect(changeServerLogLevel).toHaveBeenCalledWith("DEBUG");
    expect(renderedServerLogLevelHook.result.current.serverLogLevel).toBe("DEBUG");
  });

  it("applies the confirmed level to the desktop app logger in Electron", async () => {
    mockIsElectron = true;
    window.electron = { ipc: { invoke: jest.fn().mockResolvedValue({ success: true }) } };
    const renderedServerLogLevelHook = await renderLoadedServerLogLevelHook();
    changeServerLogLevel.mockResolvedValueOnce("DEBUG");

    await act(async () => {
      await renderedServerLogLevelHook.result.current.updateServerLogLevel("debug");
    });

    expect(window.electron.ipc.invoke).toHaveBeenCalledWith(SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL, "DEBUG");
  });

  it("does not notify the desktop app when the server rejects the change", async () => {
    mockIsElectron = true;
    window.electron = { ipc: { invoke: jest.fn() } };
    const renderedServerLogLevelHook = await renderLoadedServerLogLevelHook();
    changeServerLogLevel.mockRejectedValueOnce(new Error("Unsupported log level"));

    let serverLogLevelUpdated;
    await act(async () => {
      serverLogLevelUpdated = await renderedServerLogLevelHook.result.current.updateServerLogLevel("LOUD");
    });

    expect(serverLogLevelUpdated).toBe(false);
    expect(window.electron.ipc.invoke).not.toHaveBeenCalled();
    expect(renderedServerLogLevelHook.result.current.serverLogLevel).toBe("INFO");
  });
});
