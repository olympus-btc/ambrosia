import { act, renderHook } from "@testing-library/react";

import { usePaymentWebsocket } from "../usePaymentWebsocket";

jest.mock("@/config/api", () => ({
  getWsUrl: () => "ws://localhost:9154/ws/payments",
}));

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];

  static reset() {
    MockWebSocket.instances = [];
  }

  static latest() {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
}

describe("usePaymentWebsocket", () => {
  beforeEach(() => {
    MockWebSocket.reset();
    global.WebSocket = MockWebSocket;
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  describe("connection", () => {
    it("starts disconnected", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      expect(result.current.connected).toBe(false);
    });

    it("sets connected to true when WebSocket opens", () => {
      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        MockWebSocket.latest().readyState = MockWebSocket.OPEN;
        MockWebSocket.latest().onopen?.();
      });

      expect(result.current.connected).toBe(true);
    });

    it("sets connected to false when WebSocket closes", () => {
      const { result } = renderHook(() => usePaymentWebsocket());

      act(() => {
        MockWebSocket.latest().readyState = MockWebSocket.OPEN;
        MockWebSocket.latest().onopen?.();
      });

      expect(result.current.connected).toBe(true);

      act(() => {
        MockWebSocket.latest().onclose?.();
      });

      expect(result.current.connected).toBe(false);
    });

    it("connects to the URL returned by getWsUrl", () => {
      renderHook(() => usePaymentWebsocket());
      expect(MockWebSocket.latest().url).toBe("ws://localhost:9154/ws/payments");
    });
  });

  describe("reconnect", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("reconnects after 3 seconds when WebSocket closes", async () => {
      renderHook(() => usePaymentWebsocket());
      expect(MockWebSocket.instances).toHaveLength(1);

      act(() => {
        MockWebSocket.latest().onclose?.();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(MockWebSocket.instances).toHaveLength(2);
    });

    it("calls /api/auth/refresh before reconnecting", async () => {
      renderHook(() => usePaymentWebsocket());

      act(() => {
        MockWebSocket.latest().onclose?.();
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/auth/refresh", {
        method: "POST",
      });
    });

    it("does not reconnect after unmount", async () => {
      const { unmount } = renderHook(() => usePaymentWebsocket());
      expect(MockWebSocket.instances).toHaveLength(1);

      unmount();

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it("closes the WebSocket on unmount if it is open", () => {
      const { unmount } = renderHook(() => usePaymentWebsocket());
      const ws = MockWebSocket.latest();

      act(() => {
        ws.readyState = MockWebSocket.OPEN;
        ws.onopen?.();
      });

      unmount();

      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe("message handling", () => {
    it("calls fetchTransactions and fetchInfo on payment_received", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      const fetchInfo = jest.fn();
      const fetchTransactions = jest.fn();

      act(() => {
        result.current.setFetchers(fetchInfo, fetchTransactions);
      });

      act(() => {
        MockWebSocket.latest().onmessage?.({
          data: JSON.stringify({ type: "payment_received", paymentHash: "abc" }),
        });
      });

      expect(fetchTransactions).toHaveBeenCalledTimes(1);
      expect(fetchInfo).toHaveBeenCalledTimes(1);
    });

    it("calls onPayment listeners with message data on payment_received", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      const listener = jest.fn();

      act(() => {
        result.current.onPayment(listener);
      });

      const paymentData = { type: "payment_received", paymentHash: "abc123" };

      act(() => {
        MockWebSocket.latest().onmessage?.({ data: JSON.stringify(paymentData) });
      });

      expect(listener).toHaveBeenCalledWith(paymentData);
    });

    it("dispatches wallet:invoicePaid when paymentHash matches invoiceHash", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      const eventHandler = jest.fn();

      window.addEventListener("wallet:invoicePaid", eventHandler);

      act(() => {
        result.current.setInvoiceHash("matching-hash");
      });

      act(() => {
        MockWebSocket.latest().onmessage?.({
          data: JSON.stringify({ type: "payment_received", paymentHash: "matching-hash" }),
        });
      });

      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler.mock.calls[0][0].detail).toEqual({ paymentHash: "matching-hash" });

      window.removeEventListener("wallet:invoicePaid", eventHandler);
    });

    it("does not dispatch wallet:invoicePaid when paymentHash does not match", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      const eventHandler = jest.fn();

      window.addEventListener("wallet:invoicePaid", eventHandler);

      act(() => {
        result.current.setInvoiceHash("expected-hash");
      });

      act(() => {
        MockWebSocket.latest().onmessage?.({
          data: JSON.stringify({ type: "payment_received", paymentHash: "other-hash" }),
        });
      });

      expect(eventHandler).not.toHaveBeenCalled();

      window.removeEventListener("wallet:invoicePaid", eventHandler);
    });

    it("does not dispatch wallet:invoicePaid when invoiceHash is null", () => {
      const eventHandler = jest.fn();
      window.addEventListener("wallet:invoicePaid", eventHandler);

      renderHook(() => usePaymentWebsocket());

      act(() => {
        MockWebSocket.latest().onmessage?.({
          data: JSON.stringify({ type: "payment_received", paymentHash: "some-hash" }),
        });
      });

      expect(eventHandler).not.toHaveBeenCalled();

      window.removeEventListener("wallet:invoicePaid", eventHandler);
    });

    it("ignores messages that are not payment_received type", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      const fetchInfo = jest.fn();
      const fetchTransactions = jest.fn();
      const listener = jest.fn();

      act(() => {
        result.current.setFetchers(fetchInfo, fetchTransactions);
        result.current.onPayment(listener);
      });

      act(() => {
        MockWebSocket.latest().onmessage?.({
          data: JSON.stringify({ type: "other_event", paymentHash: "abc" }),
        });
      });

      expect(fetchTransactions).not.toHaveBeenCalled();
      expect(fetchInfo).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
    });

    it("handles invalid JSON without throwing", () => {
      renderHook(() => usePaymentWebsocket());

      expect(() => {
        act(() => {
          MockWebSocket.latest().onmessage?.({ data: "not-valid-json{{" });
        });
      }).not.toThrow();
    });
  });

  describe("onPayment", () => {
    it("cleanup function removes the listener", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      const listener = jest.fn();

      let cleanup;
      act(() => {
        cleanup = result.current.onPayment(listener);
      });

      act(() => {
        cleanup();
      });

      act(() => {
        MockWebSocket.latest().onmessage?.({
          data: JSON.stringify({ type: "payment_received", paymentHash: "abc" }),
        });
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple listeners simultaneously", () => {
      const { result } = renderHook(() => usePaymentWebsocket());
      const listenerA = jest.fn();
      const listenerB = jest.fn();

      act(() => {
        result.current.onPayment(listenerA);
        result.current.onPayment(listenerB);
      });

      act(() => {
        MockWebSocket.latest().onmessage?.({
          data: JSON.stringify({ type: "payment_received", paymentHash: "abc" }),
        });
      });

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
    });
  });
});
