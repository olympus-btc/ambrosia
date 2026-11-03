import { getApiUrl } from "@/config/api";
import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

const BACKUP_PROGRESS_WEBSOCKET_CONNECT_TIMEOUT_MS = 5000;
const DEFAULT_BACKUP_PROGRESS_TOKEN_ENDPOINT = "/backup/progress-token";

function toProgressPercent(bytesProcessed, totalBytes) {
  if (!totalBytes) return null;
  return Math.min(100, Math.round((bytesProcessed / totalBytes) * 100));
}

function buildBackupProgressWebSocketUrl(operationId, progressToken) {
  const backendUrl = new URL(getApiUrl());
  const webSocketProtocol = backendUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${webSocketProtocol}//${backendUrl.host}/ws/backup-progress?operationId=${encodeURIComponent(operationId)}&token=${encodeURIComponent(progressToken)}`;
}

async function requestBackupProgressToken(progressTokenEndpoint) {
  try {
    const progressTokenResponse = await httpClient(progressTokenEndpoint, { method: "POST" });
    if (!progressTokenResponse.ok) return null;

    const progressToken = await parseJsonResponse(progressTokenResponse, null);
    if (!progressToken?.operationId || !progressToken?.token) return null;

    return progressToken;
  } catch {
    return null;
  }
}

function connectBackupProgressSocket(operationId, progressToken, onProgress) {
  return new Promise((resolve) => {
    let settled = false;
    const socket = new WebSocket(buildBackupProgressWebSocketUrl(operationId, progressToken));

    const settle = (connectedSocket) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimeoutId);
      resolve(connectedSocket);
    };

    const connectTimeoutId = setTimeout(() => {
      socket.close();
      settle(null);
    }, BACKUP_PROGRESS_WEBSOCKET_CONNECT_TIMEOUT_MS);

    socket.onmessage = (event) => {
      let progressUpdate;
      try {
        progressUpdate = JSON.parse(event.data);
      } catch {
        return;
      }

      if (progressUpdate.type === "connected") {
        settle(socket);
        return;
      }

      onProgress({
        phase: progressUpdate.phase,
        percent: toProgressPercent(progressUpdate.bytesProcessed, progressUpdate.totalBytes),
      });
    };
    socket.onerror = () => settle(null);
    socket.onclose = () => settle(null);
  });
}

export async function openBackupProgressChannel(onProgress, progressTokenEndpoint = DEFAULT_BACKUP_PROGRESS_TOKEN_ENDPOINT) {
  if (!onProgress) return null;

  const progressToken = await requestBackupProgressToken(progressTokenEndpoint);
  if (!progressToken) return null;

  const socket = await connectBackupProgressSocket(progressToken.operationId, progressToken.token, onProgress);
  if (!socket) return null;

  return { operationId: progressToken.operationId, socket };
}

export function closeBackupProgressChannel(progressChannel) {
  progressChannel?.socket.close();
}
