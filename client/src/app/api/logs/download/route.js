import { API_URL } from "@/config/api";
import { forwardBackendFileResponse } from "@/lib/http/forwardBackendFileResponse";

export const dynamic = "force-dynamic";

export async function GET(incomingRequest) {
  const backendLogsArchiveResponse = await fetch(`${API_URL}/logs/download`, {
    method: "GET",
    headers: { Cookie: incomingRequest.headers.get("cookie") ?? "" },
  });
  return forwardBackendFileResponse(backendLogsArchiveResponse);
}
