import {
  buildVisibleLogEntriesFileName,
  formatLogEntriesAsText,
  isLogLevelAtLeast,
  keepLatestLogEntries,
  LOG_LEVEL_DEBUG,
  LOG_LEVEL_ERROR,
  LOG_LEVEL_INFO,
  LOG_LEVEL_WARN,
  logEntryMatchesFilters,
} from "../logs";

function buildLogEntry(overrides = {}) {
  return {
    timestamp: "2026-11-19T10:00:00.000-06:00",
    level: LOG_LEVEL_INFO,
    source: "server",
    logger: "Server",
    message: "Order created",
    ...overrides,
  };
}

describe("logs helpers", () => {
  describe("isLogLevelAtLeast", () => {
    it("accepts every level when no minimum is given", () => {
      expect(isLogLevelAtLeast(LOG_LEVEL_DEBUG, null)).toBe(true);
    });

    it("compares levels by severity", () => {
      expect(isLogLevelAtLeast(LOG_LEVEL_ERROR, LOG_LEVEL_WARN)).toBe(true);
      expect(isLogLevelAtLeast(LOG_LEVEL_WARN, LOG_LEVEL_WARN)).toBe(true);
      expect(isLogLevelAtLeast(LOG_LEVEL_INFO, LOG_LEVEL_WARN)).toBe(false);
    });
  });

  describe("logEntryMatchesFilters", () => {
    it("matches search text case-insensitively in message, logger and details", () => {
      expect(logEntryMatchesFilters(buildLogEntry(), { searchText: "ORDER" })).toBe(true);
      expect(logEntryMatchesFilters(buildLogEntry(), { searchText: "server" })).toBe(true);
      expect(logEntryMatchesFilters(buildLogEntry({ details: "Stack at Cart" }), { searchText: "cart" })).toBe(true);
      expect(logEntryMatchesFilters(buildLogEntry(), { searchText: "payment" })).toBe(false);
    });

    it("rejects entries below the minimum level", () => {
      expect(logEntryMatchesFilters(buildLogEntry(), { minimumLevel: LOG_LEVEL_ERROR })).toBe(false);
    });
  });

  describe("keepLatestLogEntries", () => {
    it("keeps only the newest entries when the limit is exceeded", () => {
      const logEntries = [1, 2, 3, 4, 5].map((entryNumber) => buildLogEntry({ message: `${entryNumber}` }));

      const latestLogEntries = keepLatestLogEntries(logEntries, 3);

      expect(latestLogEntries.map((logEntry) => logEntry.message)).toEqual(["3", "4", "5"]);
    });
  });

  describe("formatLogEntriesAsText", () => {
    it("writes one line per entry with the details below it", () => {
      const logEntries = [
        buildLogEntry(),
        buildLogEntry({ level: LOG_LEVEL_ERROR, logger: "Client", message: "Render failed", details: "TypeError: boom" }),
      ];

      expect(formatLogEntriesAsText(logEntries)).toBe(
        "2026-11-19T10:00:00.000-06:00 INFO  [Server] Order created\n"
          + "2026-11-19T10:00:00.000-06:00 ERROR [Client] Render failed\n"
          + "TypeError: boom\n",
      );
    });
  });

  describe("buildVisibleLogEntriesFileName", () => {
    it("names the file after the source and the local date and time", () => {
      expect(buildVisibleLogEntriesFileName("phoenixd", new Date(2026, 10, 24, 9, 5, 7))).toBe(
        "ambrosia-phoenixd-logs-2026-11-24-090507.log",
      );
    });
  });
});
