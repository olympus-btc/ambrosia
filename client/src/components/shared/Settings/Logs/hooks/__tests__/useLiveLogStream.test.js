import { act, renderHook } from "@testing-library/react";

import { refreshAccessToken } from "@/lib/http/httpClient";
import { LOGS_EVENT_SOURCE_ROUTE } from "@/lib/logs";

import { useLiveLogStream } from "../useLiveLogStream";

jest.mock("@/lib/http/httpClient", () => ({
  refreshAccessToken: jest.fn().mockResolvedValue({ ok: true }),
}));

class MockEventSource {
  static instances = [];

  constructor(eventSourceUrl) {
    this.url = eventSourceUrl;
    this.closed = false;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  static latest() {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
}

describe("useLiveLogStream", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockEventSource.instances = [];
    window.EventSource = MockEventSource;
    global.EventSource = MockEventSource;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    delete window.EventSource;
    delete global.EventSource;
  });

  it("connects to the SSE bridge for the requested source", () => {
    renderHook(() => useLiveLogStream({ source: "phoenixd", onLogEntry: jest.fn() }));

    expect(MockEventSource.latest().url).toBe(`${LOGS_EVENT_SOURCE_ROUTE}?source=phoenixd`);
  });

  it("does not connect while disabled", () => {
    renderHook(() => useLiveLogStream({ source: "server", enabled: false, onLogEntry: jest.fn() }));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("marks the stream connected and forwards log entries", () => {
    const onLogEntry = jest.fn();
    const liveLogEntry = { timestamp: "t", level: "INFO", source: "server", logger: "Server", message: "hello" };
    const renderedLiveLogStreamHook = renderHook(() => useLiveLogStream({ source: "server", onLogEntry }));

    act(() => {
      MockEventSource.latest().onmessage({ data: JSON.stringify({ type: "connected" }) });
      MockEventSource.latest().onmessage({ data: JSON.stringify({ type: "entry", entry: liveLogEntry }) });
      MockEventSource.latest().onmessage({ data: "not json" });
    });

    expect(renderedLiveLogStreamHook.result.current.liveLogStreamConnected).toBe(true);
    expect(onLogEntry).toHaveBeenCalledTimes(1);
    expect(onLogEntry).toHaveBeenCalledWith(liveLogEntry);
  });

  it("refreshes the access token and reconnects after an error", async () => {
    renderHook(() => useLiveLogStream({ source: "server", onLogEntry: jest.fn() }));
    const firstEventSource = MockEventSource.latest();

    act(() => {
      firstEventSource.onerror();
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000);
    });

    expect(firstEventSource.closed).toBe(true);
    expect(refreshAccessToken).toHaveBeenCalled();
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it("closes the stream on unmount", () => {
    const renderedLiveLogStreamHook = renderHook(() => useLiveLogStream({ source: "server", onLogEntry: jest.fn() }));

    renderedLiveLogStreamHook.unmount();

    expect(MockEventSource.latest().closed).toBe(true);
  });
});
