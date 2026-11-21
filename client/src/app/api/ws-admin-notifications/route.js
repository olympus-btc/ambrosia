import { createBackendWebSocketEventStreamResponse } from "@/lib/http/backendWebSocketEventStream";

export const dynamic = "force-dynamic";

export async function GET(incomingRequest) {
  return createBackendWebSocketEventStreamResponse(incomingRequest, "/ws/admin-notifications");
}
