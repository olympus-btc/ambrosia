import WebSocket from "ws";

import { API_URL } from "@/config/api";

const EVENT_STREAM_RESPONSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

export function buildBackendWebSocketUrl(backendWebSocketPath) {
  return `${API_URL.replace(/^http/i, "ws")}${backendWebSocketPath}`;
}

export function formatServerSentEvent(backendWebSocketPayload) {
  const serverSentEventData =
    typeof backendWebSocketPayload === "string" ? backendWebSocketPayload : backendWebSocketPayload.toString();
  return `data: ${serverSentEventData}\n\n`;
}

export function createBackendWebSocketEventStreamResponse(incomingRequest, backendWebSocketPath) {
  const requestCookieHeader = incomingRequest.headers.get("cookie") || "";

  const serverSentEventsStream = new ReadableStream({
    start(serverSentEventsController) {
      const serverSentEventEncoder = new TextEncoder();
      const backendWebSocket = new WebSocket(buildBackendWebSocketUrl(backendWebSocketPath), {
        headers: { cookie: requestCookieHeader },
      });

      const closeServerSentEventsStream = () => {
        try {
          serverSentEventsController.close();
        } catch {}
      };

      backendWebSocket.on("open", () => {
        backendWebSocket.on("message", (backendWebSocketPayload) => {
          try {
            serverSentEventsController.enqueue(
              serverSentEventEncoder.encode(formatServerSentEvent(backendWebSocketPayload)),
            );
          } catch {}
        });
      });
      backendWebSocket.on("error", closeServerSentEventsStream);
      backendWebSocket.on("close", closeServerSentEventsStream);

      incomingRequest.signal.addEventListener("abort", () => {
        if (backendWebSocket.readyState === WebSocket.OPEN) backendWebSocket.close();
      });
    },
  });

  return new Response(serverSentEventsStream, { headers: EVENT_STREAM_RESPONSE_HEADERS });
}
