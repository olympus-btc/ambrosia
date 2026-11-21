import { act, renderHook } from "@testing-library/react";

import { exportLogsArchive } from "@/services/logsService";

import { useLogsArchiveDownload } from "../useLogsArchiveDownload";

jest.mock("@/services/logsService", () => ({
  exportLogsArchive: jest.fn(),
}));

describe("useLogsArchiveDownload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports success once the archive is downloaded", async () => {
    exportLogsArchive.mockResolvedValueOnce();
    const renderedLogsArchiveDownloadHook = renderHook(() => useLogsArchiveDownload());

    let logsArchiveDownloaded;
    await act(async () => {
      logsArchiveDownloaded = await renderedLogsArchiveDownloadHook.result.current.downloadLogsArchive();
    });

    expect(logsArchiveDownloaded).toBe(true);
    expect(exportLogsArchive).toHaveBeenCalled();
    expect(renderedLogsArchiveDownloadHook.result.current.downloadingLogsArchive).toBe(false);
  });

  it("reports failure when the archive cannot be downloaded", async () => {
    exportLogsArchive.mockRejectedValueOnce(new Error("Failed to download logs archive"));
    const renderedLogsArchiveDownloadHook = renderHook(() => useLogsArchiveDownload());

    let logsArchiveDownloaded;
    await act(async () => {
      logsArchiveDownloaded = await renderedLogsArchiveDownloadHook.result.current.downloadLogsArchive();
    });

    expect(logsArchiveDownloaded).toBe(false);
    expect(renderedLogsArchiveDownloadHook.result.current.downloadingLogsArchive).toBe(false);
  });
});
