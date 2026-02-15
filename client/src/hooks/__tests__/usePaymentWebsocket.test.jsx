import { renderHook, act } from "@testing-library/react";
import { usePaymentWebsocket } from "../usePaymentWebsocket";

// ---------- MockWebSocket ----------

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this._closed = false;
    MockWebSocket.instances.push(this);
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
  }

  close() {
    this._closed = true;
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: 1000, reason: "" });
    }
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen({});
  }

  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError(error) {
    if (this.onerror) this.onerror(error || new Error("ws error"));
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000, reason: "" });
  }
}

// ---------- setup ----------

let originalWebSocket;

beforeEach(() => {
  jest.useFakeTimers();
  originalWebSocket = global.WebSocket;
  global.WebSocket = MockWebSocket;
  MockWebSocket.instances = [];

  // Clean env
  delete process.env.NEXT_PUBLIC_WS_URL;
  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.NEXT_PUBLIC_PORT_API;

  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  global.WebSocket = originalWebSocket;
  jest.restoreAllMocks();
});

function getLatestWs() {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

// ============================
// Tests
// ============================
describe("usePaymentWebsocket", () => {
  describe("connection lifecycle", () => {
    it("creates WebSocket connection on mount", () => {
      renderHook(() => usePaymentWebsocket());

      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it("sets connected=true when WS opens", () => {
      const { result } = renderHook(() => usePaymentWebsocket());

      expect(result.current.connected).toBe(false);

      act(() => {
        getLatestWs().simulateOpen();
      });

      expect(result.current.connected).toBe(true);
    });

    it("sets connected=false when WS closes", () => {
      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        getLatestWs().simulateOpen();
      });
      expect(result.current.connected).toBe(true);

      act(() => {
        getLatestWs().simulateClose();
      });
      expect(result.current.connected).toBe(false);
    });

    it("reconnects after 3 seconds on close", () => {
      renderHook(() => usePaymentWebsocket());
      expect(MockWebSocket.instances).toHaveLength(1);

      act(() => {
        getLatestWs().simulateOpen();
      });

      act(() => {
        getLatestWs().simulateClose();
      });

      // No reconnect yet
      expect(MockWebSocket.instances).toHaveLength(1);

      // Advance by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(MockWebSocket.instances).toHaveLength(2);
    });

    it("closes WS and stops reconnect on unmount", () => {
      const { unmount } = renderHook(() => usePaymentWebsocket());
      const ws = getLatestWs();

      act(() => {
        ws.simulateOpen();
      });

      unmount();

      expect(ws._closed).toBe(true);

      // Advance timers — should NOT create new connection
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  // ============================
  // URL resolution
  // ============================
  describe("URL resolution", () => {
    it("uses NEXT_PUBLIC_WS_URL when set", () => {
      process.env.NEXT_PUBLIC_WS_URL = "ws://custom:1234/ws";

      renderHook(() => usePaymentWebsocket());

      expect(getLatestWs().url).toBe("ws://custom:1234/ws");
    });

    it("derives WS URL from NEXT_PUBLIC_API_URL", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://api.example.com:9154";

      renderHook(() => usePaymentWebsocket());

      expect(getLatestWs().url).toBe("ws://api.example.com:9154/ws/payments");
    });

    it("falls back to window.location with default port", () => {
      // jsdom default: localhost
      renderHook(() => usePaymentWebsocket());

      const url = getLatestWs().url;
      expect(url).toContain("localhost");
      expect(url).toContain("9154");
      expect(url).toContain("/ws/payments");
    });
  });

  // ============================
  // Payment message handling
  // ============================
  describe("payment message handling", () => {
    it("calls fetchers on payment_received message", () => {
      const fetchTransactions = jest.fn();
      const fetchInfo = jest.fn();

      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        result.current.setFetchers(fetchInfo, fetchTransactions);
        getLatestWs().simulateOpen();
      });

      act(() => {
        getLatestWs().simulateMessage({
          type: "payment_received",
          paymentHash: "abc123",
        });
      });

      expect(fetchTransactions).toHaveBeenCalled();
      expect(fetchInfo).toHaveBeenCalled();
    });

    it("notifies registered payment listeners", () => {
      const listener = jest.fn();

      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        result.current.onPayment(listener);
        getLatestWs().simulateOpen();
      });

      const paymentData = { type: "payment_received", paymentHash: "xyz" };
      act(() => {
        getLatestWs().simulateMessage(paymentData);
      });

      expect(listener).toHaveBeenCalledWith(paymentData);
    });

    it("dispatches wallet:invoicePaid when invoice hash matches", () => {
      const dispatchSpy = jest.spyOn(window, "dispatchEvent");

      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        result.current.setInvoiceHash("matching-hash");
        getLatestWs().simulateOpen();
      });

      act(() => {
        getLatestWs().simulateMessage({
          type: "payment_received",
          paymentHash: "matching-hash",
        });
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "wallet:invoicePaid",
          detail: { paymentHash: "matching-hash" },
        }),
      );
    });

    it("does NOT dispatch wallet:invoicePaid when hash does not match", () => {
      const dispatchSpy = jest.spyOn(window, "dispatchEvent");

      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        result.current.setInvoiceHash("expected-hash");
        getLatestWs().simulateOpen();
      });

      act(() => {
        getLatestWs().simulateMessage({
          type: "payment_received",
          paymentHash: "different-hash",
        });
      });

      const invoicePaidEvents = dispatchSpy.mock.calls.filter(
        (call) => call[0].type === "wallet:invoicePaid",
      );
      expect(invoicePaidEvents).toHaveLength(0);
    });

    it("ignores non-payment_received messages", () => {
      const listener = jest.fn();

      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        result.current.onPayment(listener);
        getLatestWs().simulateOpen();
      });

      act(() => {
        getLatestWs().simulateMessage({ type: "ping" });
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ============================
  // Listener registration
  // ============================
  describe("listener management", () => {
    it("unregisters listener via returned cleanup function", () => {
      const listener = jest.fn();

      const { result } = renderHook(() => usePaymentWebsocket());
      let unregister;

      act(() => {
        unregister = result.current.onPayment(listener);
        getLatestWs().simulateOpen();
      });

      // Fire event — listener should be called
      act(() => {
        getLatestWs().simulateMessage({ type: "payment_received", paymentHash: "h1" });
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // Unregister
      act(() => {
        unregister();
      });

      // Fire event again — listener should NOT be called
      act(() => {
        getLatestWs().simulateMessage({ type: "payment_received", paymentHash: "h2" });
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
