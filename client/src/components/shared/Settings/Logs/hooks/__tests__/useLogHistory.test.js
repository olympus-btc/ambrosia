import { act, renderHook } from "@testing-library/react";

import { getLogHistory } from "@/services/logsService";

import { useLogHistory } from "../useLogHistory";

jest.mock("@/services/logsService", () => ({
  getLogHistory: jest.fn(),
}));

describe("useLogHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the loaded log entries", async () => {
    const loadedLogEntries = [{ timestamp: "t", level: "WARN", source: "server", logger: "Server", message: "slow" }];
    getLogHistory.mockResolvedValueOnce(loadedLogEntries);
    const renderedLogHistoryHook = renderHook(() => useLogHistory());

    let returnedLogEntries;
    await act(async () => {
      returnedLogEntries = await renderedLogHistoryHook.result.current.loadLogHistory({ source: "server" });
    });

    expect(getLogHistory).toHaveBeenCalledWith({ source: "server" });
    expect(returnedLogEntries).toEqual(loadedLogEntries);
    expect(renderedLogHistoryHook.result.current.loadingLogHistory).toBe(false);
  });

  it("returns an empty history and keeps the error when the request fails", async () => {
    const logHistoryRequestError = new Error("Logs request failed (500)");
    getLogHistory.mockRejectedValueOnce(logHistoryRequestError);
    const renderedLogHistoryHook = renderHook(() => useLogHistory());

    let returnedLogEntries;
    await act(async () => {
      returnedLogEntries = await renderedLogHistoryHook.result.current.loadLogHistory({ source: "server" });
    });

    expect(returnedLogEntries).toEqual([]);
    expect(renderedLogHistoryHook.result.current.logHistoryError).toBe(logHistoryRequestError);
  });
});
