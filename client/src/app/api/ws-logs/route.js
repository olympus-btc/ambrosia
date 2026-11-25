import { createBackendWebSocketEventStreamResponse } from "@/lib/http/backendWebSocketEventStream";
import { LOG_SOURCE_SERVER, LOG_SOURCES } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET(incomingRequest) {
  const requestedLogSource = new URL(incomingRequest.url).searchParams.get("source");
  const validatedLogSource = LOG_SOURCES.includes(requestedLogSource) ? requestedLogSource : LOG_SOURCE_SERVER;
  return createBackendWebSocketEventStreamResponse(incomingRequest, `/ws/logs?source=${encodeURIComponent(validatedLogSource)}`);
}
