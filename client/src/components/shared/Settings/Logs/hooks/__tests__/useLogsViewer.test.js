import { act, renderHook } from "@testing-library/react";

import { useLiveLogStream } from "../useLiveLogStream";
import { useLogHistory } from "../useLogHistory";
import { useLogSources } from "../useLogSources";
import { useLogsViewer } from "../useLogsViewer";

jest.mock("../useLogSources", () => ({ useLogSources: jest.fn() }));
jest.mock("../useLogHistory", () => ({ useLogHistory: jest.fn() }));
jest.mock("../useLiveLogStream", () => ({ useLiveLogStream: jest.fn() }));
jest.mock("../useDebouncedSearchText", () => ({
  useDebouncedSearchText: (searchText) => searchText,
}));

function buildServerLogEntry(message) {
  return { timestamp: `2026-11-20T10:00:00.000-06:00-${message}`, level: "INFO", source: "server", logger: "Server", message };
}

describe("useLogsViewer", () => {
  let resolvePendingLogHistory;
  let latestLiveLogStreamOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    useLogSources.mockReturnValue({
      findLogSourceAvailability: () => ({ id: "server", available: true }),
      isLogSourceAvailable: () => true,
    });
    useLogHistory.mockReturnValue({
      loadingLogHistory: false,
      loadLogHistory: jest.fn(() => new Promise((resolve) => {
        resolvePendingLogHistory = resolve;
      })),
    });
    useLiveLogStream.mockImplementation((liveLogStreamOptions) => {
      latestLiveLogStreamOptions = liveLogStreamOptions;
      return { liveLogStreamConnected: true };
    });
  });

  it("keeps live entries that arrive while the history loads and drops the ones already in the history", async () => {
    const renderedLogsViewerHook = renderHook(() => useLogsViewer());
    const entryOnlyInLiveStream = buildServerLogEntry("only live");
    const entryInBothSources = buildServerLogEntry("in both");
    const entryOnlyInHistory = buildServerLogEntry("only history");

    act(() => {
      latestLiveLogStreamOptions.onLogEntry(entryInBothSources);
      latestLiveLogStreamOptions.onLogEntry(entryOnlyInLiveStream);
    });
    await act(async () => {
      resolvePendingLogHistory([entryOnlyInHistory, entryInBothSources]);
    });

    const visibleLogEntries = renderedLogsViewerHook.result.current.visibleLogEntries;
    expect(visibleLogEntries.map((visibleLogEntry) => visibleLogEntry.message)).toEqual([
      "only history",
      "in both",
      "only live",
    ]);
    const viewerEntryKeys = visibleLogEntries.map((visibleLogEntry) => visibleLogEntry.viewerEntryKey);
    expect(new Set(viewerEntryKeys).size).toBe(viewerEntryKeys.length);
  });

  it("ignores live entries that do not match the active level filter", async () => {
    const renderedLogsViewerHook = renderHook(() => useLogsViewer());
    await act(async () => {
      resolvePendingLogHistory([]);
    });

    act(() => {
      renderedLogsViewerHook.result.current.setMinimumLogLevelFilter("ERROR");
    });
    await act(async () => {
      resolvePendingLogHistory([]);
    });
    act(() => {
      latestLiveLogStreamOptions.onLogEntry(buildServerLogEntry("plain info"));
      latestLiveLogStreamOptions.onLogEntry({ ...buildServerLogEntry("real error"), level: "ERROR" });
    });

    expect(renderedLogsViewerHook.result.current.visibleLogEntries.map((visibleLogEntry) => visibleLogEntry.message))
      .toEqual(["real error"]);
  });
});
