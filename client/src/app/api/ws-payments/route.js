import WebSocket from "ws";

import { API_URL } from "@/config/api";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const backendWsUrl = `${API_URL.replace(/^http/i, "ws")}/ws/payments`;
  const cookies = request.headers.get("cookie") || "";

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const ws = new WebSocket(backendWsUrl, {
        headers: { cookie: cookies },
      });

      ws.on("open", () => {
        ws.on("message", (raw) => {
          const message = typeof raw === "string" ? raw : raw.toString();
          try {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch {}
        });
      });

      ws.on("error", () => {
        try {
          controller.close();
        } catch {}
      });

      ws.on("close", () => {
        try {
          controller.close();
        } catch {}
      });

      request.signal.addEventListener("abort", () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
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
