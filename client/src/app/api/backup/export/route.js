import { API_URL } from "@/config/api";
import { forwardBackendFileResponse } from "@/lib/http/forwardBackendFileResponse";

export async function POST(incomingRequest) {
  const requestBody = await incomingRequest.text();
  const cookieHeader = incomingRequest.headers.get("cookie") ?? "";
  const operationIdHeader = incomingRequest.headers.get("x-backup-operation-id");

  const backendBackupArchiveResponse = await fetch(`${API_URL}/backup/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...(operationIdHeader ? { "X-Backup-Operation-Id": operationIdHeader } : {}),
    },
    body: requestBody,
  });

  return forwardBackendFileResponse(backendBackupArchiveResponse, ["x-backup-total-bytes"]);
}
