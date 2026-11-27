export const LOGS_EVENT_SOURCE_ROUTE = "/api/ws-logs";
export const LOGS_ENDPOINT = "/logs";
export const LOGS_SOURCES_ENDPOINT = "/logs/sources";
export const LOGS_SETTINGS_ENDPOINT = "/logs/settings";
export const LOGS_DOWNLOAD_ENDPOINT = "/logs/download";
export const CLIENT_LOG_REPORTS_ENDPOINT = "/logs/client";

export const LOG_SOURCE_SERVER = "server";
export const LOG_SOURCE_PHOENIXD = "phoenixd";
export const LOG_SOURCE_CLIENT = "client";
export const LOG_SOURCES = [LOG_SOURCE_SERVER, LOG_SOURCE_PHOENIXD, LOG_SOURCE_CLIENT];

export const LOG_LEVEL_TRACE = "TRACE";
export const LOG_LEVEL_DEBUG = "DEBUG";
export const LOG_LEVEL_INFO = "INFO";
export const LOG_LEVEL_WARN = "WARN";
export const LOG_LEVEL_ERROR = "ERROR";
export const LOG_FILTER_LEVELS = [LOG_LEVEL_DEBUG, LOG_LEVEL_INFO, LOG_LEVEL_WARN, LOG_LEVEL_ERROR];
export const CONFIGURABLE_SERVER_LOG_LEVELS = [LOG_LEVEL_ERROR, LOG_LEVEL_WARN, LOG_LEVEL_INFO, LOG_LEVEL_DEBUG];
export const CONFIGURABLE_LOG_RETENTION_DAYS = [1, 3, 7, 14, 30];
export const CONFIGURABLE_LOG_MAXIMUM_TOTAL_SIZE_MEGABYTES = [10, 20, 50, 100];

export const LOG_STREAM_EVENT_CONNECTED = "connected";
export const LOG_STREAM_EVENT_ENTRY = "entry";

export const DEFAULT_LOG_HISTORY_LINES = 500;
export const MAXIMUM_VISIBLE_LOG_ENTRIES = 2000;
export const LOG_STREAM_RECONNECT_DELAY_MILLISECONDS = 3000;

const LOG_LEVEL_SEVERITY = {
  [LOG_LEVEL_TRACE]: 0,
  [LOG_LEVEL_DEBUG]: 1,
  [LOG_LEVEL_INFO]: 2,
  [LOG_LEVEL_WARN]: 3,
  [LOG_LEVEL_ERROR]: 4,
};

export function isLogLevelAtLeast(levelName, minimumLevelName) {
  if (!minimumLevelName) return true;
  const levelSeverity = LOG_LEVEL_SEVERITY[levelName] ?? LOG_LEVEL_SEVERITY[LOG_LEVEL_INFO];
  return levelSeverity >= LOG_LEVEL_SEVERITY[minimumLevelName];
}

export function logEntryMatchesFilters(logEntry, { minimumLevel, searchText }) {
  if (!isLogLevelAtLeast(logEntry.level, minimumLevel)) return false;
  const normalizedSearchText = searchText?.trim().toLowerCase();
  if (!normalizedSearchText) return true;
  return [logEntry.message, logEntry.logger, logEntry.details]
    .filter(Boolean)
    .some((logEntryText) => logEntryText.toLowerCase().includes(normalizedSearchText));
}

export function buildLogEntryIdentity(logEntry) {
  return [logEntry.timestamp, logEntry.level, logEntry.logger, logEntry.message].join("|");
}

export function keepLatestLogEntries(logEntries, maximumEntries = MAXIMUM_VISIBLE_LOG_ENTRIES) {
  return logEntries.length > maximumEntries ? logEntries.slice(logEntries.length - maximumEntries) : logEntries;
}

export function formatLogEntriesAsText(logEntries) {
  return logEntries
    .map((logEntry) => {
      const logEntryLine = `${logEntry.timestamp} ${String(logEntry.level).padEnd(5)} [${logEntry.logger}] ${logEntry.message}`;
      return logEntry.details ? `${logEntryLine}\n${logEntry.details}` : logEntryLine;
    })
    .join("\n")
    .concat("\n");
}

function padDatePart(datePart) {
  return String(datePart).padStart(2, "0");
}

export function buildVisibleLogEntriesFileName(logSource, generatedAt = new Date()) {
  const fileNameDate = [generatedAt.getFullYear(), padDatePart(generatedAt.getMonth() + 1), padDatePart(generatedAt.getDate())].join("-");
  const fileNameTime = [generatedAt.getHours(), generatedAt.getMinutes(), generatedAt.getSeconds()].map(padDatePart).join("");
  return `ambrosia-${logSource}-logs-${fileNameDate}-${fileNameTime}.log`;
}
