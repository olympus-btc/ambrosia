import { httpClient } from "@/lib/http";
import { downloadBlob } from "@/utils/downloadBlob";

import {
  buildLogHistoryEndpoint,
  changeServerLogLevel,
  exportLogsArchive,
  getLogHistory,
  getLogSources,
  getServerLogLevel,
  readFileNameFromContentDisposition,
} from "../logsService";

jest.mock("@/lib/http", () => ({
  ...jest.requireActual("@/lib/http"),
  httpClient: jest.fn(),
}));

jest.mock("@/utils/downloadBlob", () => ({
  downloadBlob: jest.fn(),
}));

function buildJsonResponse(status, responseBody) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: jest.fn().mockResolvedValue(responseBody),
    text: jest.fn().mockResolvedValue(JSON.stringify(responseBody)),
  };
}

function buildLogsArchiveResponse({ status = 200, contentDisposition = null } = {}) {
  const logsArchiveHeaders = new Headers();
  if (contentDisposition) logsArchiveHeaders.set("content-disposition", contentDisposition);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: logsArchiveHeaders,
    blob: jest.fn().mockResolvedValue(new Blob(["zip"])),
    json: jest.fn().mockResolvedValue({ message: "Admin privileges required" }),
    text: jest.fn().mockResolvedValue(""),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("logsService", () => {
  describe("buildLogHistoryEndpoint", () => {
    it("builds the history endpoint with source, line count, level and trimmed search text", () => {
      expect(buildLogHistoryEndpoint({ source: "server", minimumLevel: "WARN", searchText: "  slow  " }))
        .toBe("/logs?source=server&lines=500&level=WARN&search=slow");
      expect(buildLogHistoryEndpoint({ source: "client", minimumLevel: null, searchText: "", lines: 50 }))
        .toBe("/logs?source=client&lines=50");
    });
  });

  describe("readFileNameFromContentDisposition", () => {
    it("reads the file name and falls back to a default one", () => {
      expect(readFileNameFromContentDisposition("attachment; filename=ambrosia-logs-2026-11-19.zip"))
        .toBe("ambrosia-logs-2026-11-19.zip");
      expect(readFileNameFromContentDisposition("attachment; filename=\"quoted.zip\"")).toBe("quoted.zip");
      expect(readFileNameFromContentDisposition(null)).toBe("ambrosia-logs.zip");
    });
  });

  describe("getLogSources", () => {
    it("returns the sources sent by the server", async () => {
      const logSources = [{ id: "server", available: true }];
      httpClient.mockResolvedValueOnce(buildJsonResponse(200, { sources: logSources }));

      await expect(getLogSources()).resolves.toEqual(logSources);
      expect(httpClient).toHaveBeenCalledWith("/logs/sources");
    });

    it("throws with the response status when the request fails", async () => {
      httpClient.mockResolvedValueOnce(buildJsonResponse(403, { message: "Admin privileges required" }));

      await expect(getLogSources()).rejects.toMatchObject({ status: 403, responseMessage: "Admin privileges required" });
    });
  });

  describe("getLogHistory", () => {
    it("requests the filtered history and returns its entries", async () => {
      const logEntries = [{ timestamp: "t", level: "WARN", source: "server", logger: "Server", message: "slow" }];
      httpClient.mockResolvedValueOnce(buildJsonResponse(200, { entries: logEntries }));

      await expect(getLogHistory({ source: "server", minimumLevel: "WARN" })).resolves.toEqual(logEntries);
      expect(httpClient).toHaveBeenCalledWith("/logs?source=server&lines=500&level=WARN");
    });

    it("throws when the server rejects the query", async () => {
      httpClient.mockResolvedValueOnce(buildJsonResponse(400, { message: "Unknown log source" }));

      await expect(getLogHistory({ source: "unknown" })).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("getServerLogLevel", () => {
    it("returns the current server log level", async () => {
      httpClient.mockResolvedValueOnce(buildJsonResponse(200, { level: "INFO" }));

      await expect(getServerLogLevel()).resolves.toBe("INFO");
      expect(httpClient).toHaveBeenCalledWith("/logs/level");
    });
  });

  describe("changeServerLogLevel", () => {
    it("sends the requested level and returns the level confirmed by the server", async () => {
      httpClient.mockResolvedValueOnce(buildJsonResponse(200, { level: "DEBUG" }));

      await expect(changeServerLogLevel("debug")).resolves.toBe("DEBUG");
      expect(httpClient).toHaveBeenCalledWith("/logs/level", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "debug" }),
      });
    });

    it("throws when the server rejects the level", async () => {
      httpClient.mockResolvedValueOnce(buildJsonResponse(400, { message: "Unsupported log level" }));

      await expect(changeServerLogLevel("LOUD")).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("exportLogsArchive", () => {
    it("downloads the archive with the file name sent by the server", async () => {
      httpClient.mockResolvedValueOnce(
        buildLogsArchiveResponse({ contentDisposition: "attachment; filename=ambrosia-logs-2026-11-19-101500.zip" }),
      );

      await exportLogsArchive();

      expect(httpClient).toHaveBeenCalledWith("/logs/download");
      expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "ambrosia-logs-2026-11-19-101500.zip");
    });

    it("throws without downloading when the server rejects the request", async () => {
      httpClient.mockResolvedValueOnce(buildLogsArchiveResponse({ status: 403 }));

      await expect(exportLogsArchive()).rejects.toMatchObject({ status: 403 });
      expect(downloadBlob).not.toHaveBeenCalled();
    });
  });
});
