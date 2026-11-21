import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient, parseJsonResponse } from "@/lib/http";
import {
  DEFAULT_LOG_HISTORY_LINES,
  LOGS_DOWNLOAD_ENDPOINT,
  LOGS_ENDPOINT,
  LOGS_LEVEL_ENDPOINT,
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

export async function getServerLogLevel() {
  const serverLogLevelResponse = await httpClient(LOGS_LEVEL_ENDPOINT);
  if (!serverLogLevelResponse.ok) {
    throw await buildParsedHttpError(serverLogLevelResponse, "Failed to get server log level");
  }
  const serverLogLevelResponseBody = await parseJsonResponse(serverLogLevelResponse, null);
  return serverLogLevelResponseBody?.level ?? null;
}

export async function changeServerLogLevel(requestedServerLogLevel) {
  const changeServerLogLevelResponse = await httpClient(LOGS_LEVEL_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: requestedServerLogLevel }),
  });
  if (!changeServerLogLevelResponse.ok) {
    throw await buildParsedHttpError(changeServerLogLevelResponse, "Failed to update server log level");
  }
  const changedServerLogLevelResponseBody = await parseJsonResponse(changeServerLogLevelResponse, null);
  return changedServerLogLevelResponseBody?.level ?? requestedServerLogLevel;
}

export async function exportLogsArchive() {
  const logsArchiveResponse = await httpClient(LOGS_DOWNLOAD_ENDPOINT);
  if (!logsArchiveResponse.ok) {
    throw await buildParsedHttpError(logsArchiveResponse, "Failed to download logs archive");
  }
  const logsArchiveBlob = await logsArchiveResponse.blob();
  downloadBlob(logsArchiveBlob, readFileNameFromContentDisposition(logsArchiveResponse.headers.get("content-disposition")));
}
