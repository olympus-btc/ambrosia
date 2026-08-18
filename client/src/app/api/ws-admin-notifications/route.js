import WebSocket from "ws";

import { API_URL } from "@/config/api";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const backendAdminNotificationsWebSocketUrl = `${API_URL.replace(/^http/i, "ws")}/ws/admin-notifications`;
  const requestCookies = request.headers.get("cookie") || "";

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const backendAdminNotificationsSocket = new WebSocket(backendAdminNotificationsWebSocketUrl, {
        headers: { cookie: requestCookies },
      });

      backendAdminNotificationsSocket.on("open", () => {
        backendAdminNotificationsSocket.on("message", (backendWebSocketPayload) => {
          const adminNotificationMessage =
            typeof backendWebSocketPayload === "string"
              ? backendWebSocketPayload
              : backendWebSocketPayload.toString();
          try {
            controller.enqueue(encoder.encode(`data: ${adminNotificationMessage}\n\n`));
          } catch {}
        });
      });

      backendAdminNotificationsSocket.on("error", () => {
        try {
          controller.close();
        } catch {}
      });

      backendAdminNotificationsSocket.on("close", () => {
        try {
          controller.close();
        } catch {}
      });

      request.signal.addEventListener("abort", () => {
        if (backendAdminNotificationsSocket.readyState === WebSocket.OPEN) {
          backendAdminNotificationsSocket.close();
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
