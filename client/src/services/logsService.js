import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient, parseJsonResponse } from "@/lib/http";
import {
  DEFAULT_LOG_HISTORY_LINES,
  LOGS_DOWNLOAD_ENDPOINT,
  LOGS_ENDPOINT,
  LOGS_SETTINGS_ENDPOINT,
  LOGS_SOURCES_ENDPOINT,
} from "@/lib/logs";
import { downloadBlob } from "@/utils/downloadBlob";

const DEFAULT_LOGS_ARCHIVE_FILE_NAME = "ambrosia-logs.zip";

export function buildLogHistoryEndpoint({ source, minimumLevel, searchText, lines = DEFAULT_LOG_HISTORY_LINES }) {
  const logHistoryQueryParameters = new URLSearchParams({ source, lines: String(lines) });
  if (minimumLevel) logHistoryQueryParameters.set("level", minimumLevel);
  const trimmedSearchText = searchText?.trim();
  if (trimmedSearchText) logHistoryQueryParameters.set("search", trimmedSearchText);
  return `${LOGS_ENDPOINT}?${logHistoryQueryParameters.toString()}`;
}

export function readFileNameFromContentDisposition(contentDispositionHeader) {
  const fileNameMatch = contentDispositionHeader?.match(/filename="?([^";]+)"?/i);
  return fileNameMatch?.[1] || DEFAULT_LOGS_ARCHIVE_FILE_NAME;
}

export async function getLogSources() {
  const logSourcesResponse = await httpClient(LOGS_SOURCES_ENDPOINT);
  if (!logSourcesResponse.ok) {
    throw await buildParsedHttpError(logSourcesResponse, "Failed to get log sources");
  }
  const logSourcesResponseBody = await parseJsonResponse(logSourcesResponse, null);
  return logSourcesResponseBody?.sources ?? [];
}

export async function getLogHistory(logHistoryQuery) {
  const logHistoryResponse = await httpClient(buildLogHistoryEndpoint(logHistoryQuery));
  if (!logHistoryResponse.ok) {
    throw await buildParsedHttpError(logHistoryResponse, "Failed to get log history");
  }
  const logHistoryResponseBody = await parseJsonResponse(logHistoryResponse, null);
  return logHistoryResponseBody?.entries ?? [];
}

export async function getLogSettings() {
  const logSettingsResponse = await httpClient(LOGS_SETTINGS_ENDPOINT);
  if (!logSettingsResponse.ok) {
    throw await buildParsedHttpError(logSettingsResponse, "Failed to get log settings");
  }
  return parseJsonResponse(logSettingsResponse, null);
}

export async function updateLogSettings(requestedLogSettings) {
  const updateLogSettingsResponse = await httpClient(LOGS_SETTINGS_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestedLogSettings),
  });
  if (!updateLogSettingsResponse.ok) {
    throw await buildParsedHttpError(updateLogSettingsResponse, "Failed to update log settings");
  }
  const updatedLogSettings = await parseJsonResponse(updateLogSettingsResponse, null);
  return updatedLogSettings ?? requestedLogSettings;
}

export async function exportLogsArchive() {
  const logsArchiveResponse = await httpClient(LOGS_DOWNLOAD_ENDPOINT);
  if (!logsArchiveResponse.ok) {
    throw await buildParsedHttpError(logsArchiveResponse, "Failed to download logs archive");
  }
  const logsArchiveBlob = await logsArchiveResponse.blob();
  downloadBlob(logsArchiveBlob, readFileNameFromContentDisposition(logsArchiveResponse.headers.get("content-disposition")));
}
