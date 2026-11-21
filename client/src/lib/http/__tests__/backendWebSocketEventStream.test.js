/**
 * @jest-environment node
 */
import WebSocket from "ws";

import {
  buildBackendWebSocketUrl,
  createBackendWebSocketEventStreamResponse,
  formatServerSentEvent,
} from "../backendWebSocketEventStream";

jest.mock("ws", () => {
  const FakeBackendWebSocket = jest.fn().mockImplementation(() => {
    const fakeBackendWebSocket = new (jest.requireActual("events").EventEmitter)();
    fakeBackendWebSocket.readyState = FakeBackendWebSocket.CONNECTING;
    fakeBackendWebSocket.close = jest.fn();
    fakeBackendWebSocket.terminate = jest.fn();
    FakeBackendWebSocket.latestInstance = fakeBackendWebSocket;
    return fakeBackendWebSocket;
  });
  FakeBackendWebSocket.CONNECTING = 0;
  FakeBackendWebSocket.OPEN = 1;
  return FakeBackendWebSocket;
});

jest.mock("@/config/api", () => ({
  API_URL: "http://ambrosia:9154",
}));

function createIncomingRequestWithAbortController() {
  const incomingRequestAbortController = new AbortController();
  const incomingRequest = new Request("http://localhost:3000/api/ws-logs", {
    headers: { cookie: "accessToken=session" },
    signal: incomingRequestAbortController.signal,
  });
  return { incomingRequest, incomingRequestAbortController };
}

describe("backendWebSocketEventStream", () => {
  beforeEach(() => {
    WebSocket.mockClear();
  });

  it("builds the backend WebSocket URL from the API URL", () => {
    expect(buildBackendWebSocketUrl("/ws/logs?source=server")).toBe("ws://ambrosia:9154/ws/logs?source=server");
  });

  it("formats string and buffer payloads as server-sent events", () => {
    expect(formatServerSentEvent("{\"type\":\"connected\"}")).toBe("data: {\"type\":\"connected\"}\n\n");
    expect(formatServerSentEvent(Buffer.from("{\"type\":\"entry\"}"))).toBe("data: {\"type\":\"entry\"}\n\n");
  });

  it("forwards the session cookie to the backend WebSocket", () => {
    const { incomingRequest } = createIncomingRequestWithAbortController();

    createBackendWebSocketEventStreamResponse(incomingRequest, "/ws/payments");

    expect(WebSocket).toHaveBeenCalledWith("ws://ambrosia:9154/ws/payments", {
      headers: { cookie: "accessToken=session" },
    });
  });

  it("closes an open backend WebSocket when the browser disconnects", () => {
    const { incomingRequest, incomingRequestAbortController } = createIncomingRequestWithAbortController();
    createBackendWebSocketEventStreamResponse(incomingRequest, "/ws/payments");
    const backendWebSocket = WebSocket.latestInstance;
    backendWebSocket.readyState = WebSocket.OPEN;

    incomingRequestAbortController.abort();

    expect(backendWebSocket.close).toHaveBeenCalled();
    expect(backendWebSocket.terminate).not.toHaveBeenCalled();
  });

  it("aborts a backend WebSocket that is still connecting when the browser disconnects", () => {
    const { incomingRequest, incomingRequestAbortController } = createIncomingRequestWithAbortController();
    createBackendWebSocketEventStreamResponse(incomingRequest, "/ws/payments");
    const backendWebSocket = WebSocket.latestInstance;

    incomingRequestAbortController.abort();

    expect(backendWebSocket.terminate).toHaveBeenCalled();
    expect(backendWebSocket.close).not.toHaveBeenCalled();
  });
});
