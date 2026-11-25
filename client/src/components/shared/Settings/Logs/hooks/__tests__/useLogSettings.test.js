import { act, renderHook, waitFor } from "@testing-library/react";

import { getLogSettings, updateLogSettings } from "@/services/logsService";

import { SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL, useLogSettings } from "../useLogSettings";

jest.mock("@/services/logsService", () => ({
  getLogSettings: jest.fn(),
  updateLogSettings: jest.fn(),
}));

let mockIsElectron = false;
jest.mock("@/lib/isElectron", () => ({
  get isElectron() {
    return mockIsElectron;
  },
}));

const savedLogSettings = {
  level: "INFO",
  retentionDays: 7,
  maximumTotalSizeMegabytes: 20,
  clientErrorReportingEnabled: true,
};

describe("useLogSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsElectron = false;
    delete window.electron;
  });

  async function renderLoadedLogSettingsHook() {
    getLogSettings.mockResolvedValueOnce(savedLogSettings);
    const renderedLogSettingsHook = renderHook(() => useLogSettings());
    await waitFor(() => expect(renderedLogSettingsHook.result.current.logSettings).toEqual(savedLogSettings));
    return renderedLogSettingsHook;
  }

  it("loads the current log settings", async () => {
    await renderLoadedLogSettingsHook();

    expect(getLogSettings).toHaveBeenCalled();
  });

  it("keeps the load error when the settings cannot be loaded", async () => {
    const loadLogSettingsError = new Error("Forbidden");
    getLogSettings.mockRejectedValueOnce(loadLogSettingsError);

    const renderedLogSettingsHook = renderHook(() => useLogSettings());

    await waitFor(() => expect(renderedLogSettingsHook.result.current.logSettingsError).toBe(loadLogSettingsError));
    expect(renderedLogSettingsHook.result.current.logSettings).toBeNull();
  });

  it("saves the settings without notifying a desktop app in the browser", async () => {
    const renderedLogSettingsHook = await renderLoadedLogSettingsHook();
    const requestedLogSettings = { ...savedLogSettings, level: "DEBUG", retentionDays: 14 };
    updateLogSettings.mockResolvedValueOnce(requestedLogSettings);

    let logSettingsSaved;
    await act(async () => {
      logSettingsSaved = await renderedLogSettingsHook.result.current.saveLogSettings(requestedLogSettings);
    });

    expect(logSettingsSaved).toBe(true);
    expect(updateLogSettings).toHaveBeenCalledWith(requestedLogSettings);
    expect(renderedLogSettingsHook.result.current.logSettings).toEqual(requestedLogSettings);
  });

  it("applies the confirmed level to the desktop app logger in Electron", async () => {
    mockIsElectron = true;
    window.electron = { ipc: { invoke: jest.fn().mockResolvedValue({ success: true }) } };
    const renderedLogSettingsHook = await renderLoadedLogSettingsHook();
    updateLogSettings.mockResolvedValueOnce({ ...savedLogSettings, level: "DEBUG" });

    await act(async () => {
      await renderedLogSettingsHook.result.current.saveLogSettings({ ...savedLogSettings, level: "debug" });
    });

    expect(window.electron.ipc.invoke).toHaveBeenCalledWith(SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL, "DEBUG");
  });

  it("keeps the saved settings and does not notify the desktop app when the server rejects them", async () => {
    mockIsElectron = true;
    window.electron = { ipc: { invoke: jest.fn() } };
    const renderedLogSettingsHook = await renderLoadedLogSettingsHook();
    updateLogSettings.mockRejectedValueOnce(new Error("Unsupported log retention"));

    let logSettingsSaved;
    await act(async () => {
      logSettingsSaved = await renderedLogSettingsHook.result.current.saveLogSettings({ ...savedLogSettings, retentionDays: 2 });
    });

    expect(logSettingsSaved).toBe(false);
    expect(window.electron.ipc.invoke).not.toHaveBeenCalled();
    expect(renderedLogSettingsHook.result.current.logSettings).toEqual(savedLogSettings);
  });
});
