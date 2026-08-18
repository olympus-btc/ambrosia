import { act } from "react";

import { addToast } from "@heroui/react";
import { waitFor, renderHook } from "@testing-library/react";

import {
  deleteCheckout,
  getCompletedCheckouts,
  getPendingCheckouts,
  markCheckoutCompleted,
} from "@/lib/btcCheckoutStore";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { useCartPayment } from "../useCartPayment";

let mockPaymentMethods;
let mockPaymentMethodsForbidden;
let mockPaymentCurrencyForbidden;

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("@/lib/btcCheckoutStore", () => ({
  getCompletedCheckouts: jest.fn(),
  getPendingCheckouts: jest.fn(),
  markCheckoutCompleted: jest.fn(),
  deleteCheckout: jest.fn(),
}));

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({ user: { userId: "u1", name: "Tester" } }),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { id: "cur-1", acronym: "MXN" },
    formatAmount: (amount) => `fmt-${amount}`,
  }),
}));

jest.mock("../usePaymentMethod", () => ({
  usePaymentMethods: () => ({
    paymentMethods: mockPaymentMethods,
    forbidden: mockPaymentMethodsForbidden,
  }),
}));

jest.mock("../../../hooks/usePaymentCurrency", () => ({
  usePaymentCurrency: () => ({
    getPaymentCurrencyById: jest.fn(() => Promise.resolve({ acronym: "USD" })),
    forbidden: mockPaymentCurrencyForbidden,
  }),
}));

jest.mock("../../../hooks/usePrinter", () => ({
  usePrinters: () => ({
    printTicket: jest.fn(() => Promise.resolve()),
    printerConfigs: [{ id: "cfg-1", printerType: "CUSTOMER", enabled: true }],
    loadingConfigs: false,
  }),
}));

describe("useCartPayment", () => {
  beforeEach(() => {
    mockPaymentMethods = [
      { id: "btc", name: "BTC" },
      { id: "cash", name: "Cash" },
    ];
    mockPaymentMethodsForbidden = false;
    mockPaymentCurrencyForbidden = false;

    addToast.mockClear();
    getCompletedCheckouts.mockReset().mockResolvedValue([]);
    getPendingCheckouts.mockReset().mockResolvedValue([]);
    deleteCheckout.mockReset().mockResolvedValue(undefined);
    markCheckoutCompleted.mockReset().mockResolvedValue(undefined);
    httpClient.mockReset();
    parseJsonResponse.mockReset();
  });

  it("handles BTC payment config and clearing", async () => {
    const { result } = renderHook(() => useCartPayment());

    await act(async () => {
      await result.current.handlePay({
        items: [{ id: 1, subtotal: 100 }],
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
        selectedPaymentMethod: "btc",
      });
    });

    await waitFor(() => {
      expect(result.current.btcPayment.config).toEqual(
        expect.objectContaining({
          amountFiat: 1,
          currencyAcronym: "usd",
          displayTotal: "fmt-100",
          selectedPaymentMethod: "btc",
        }),
      );
    });

    act(() => {
      result.current.btcPayment.onClose();
    });

    expect(result.current.btcPayment.config).toBeNull();
  });

  it("handles cash payment config and clearing", async () => {
    const { result } = renderHook(() => useCartPayment());

    await act(async () => {
      await result.current.handlePay({
        items: [{ id: 1, subtotal: 100 }],
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
        selectedPaymentMethod: "cash",
      });
    });

    await waitFor(() => {
      expect(result.current.cashPayment.config).toEqual(
        expect.objectContaining({
          amountDue: 1,
          displayTotal: "fmt-100",
        }),
      );
    });

    act(() => {
      result.current.cashPayment.onClose();
    });

    expect(result.current.cashPayment.config).toBeNull();
  });

  it("handles card payment config and clearing", async () => {
    mockPaymentMethods = [
      { id: "credit", name: "Credit Card" },
    ];
    const { result } = renderHook(() => useCartPayment());

    await act(async () => {
      await result.current.handlePay({
        items: [{ id: 1, subtotal: 100 }],
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
        selectedPaymentMethod: "credit",
      });
    });

    await waitFor(() => {
      expect(result.current.cardPayment.config).toEqual(
        expect.objectContaining({
          amountDue: 1,
          displayTotal: "fmt-100",
          methodLabel: "Credit Card",
        }),
      );
    });

    act(() => {
      result.current.cardPayment.onClose();
    });

    expect(result.current.cardPayment.config).toBeNull();
  });

  it("handles missing payment methods without crashing", () => {
    mockPaymentMethods = undefined;
    const { result } = renderHook(() => useCartPayment());

    expect(typeof result.current.handlePay).toBe("function");
  });

  it("reports paymentsForbidden when payment methods are forbidden", () => {
    mockPaymentMethodsForbidden = true;
    const { result } = renderHook(() => useCartPayment());

    expect(result.current.paymentsForbidden).toBe(true);
  });

  it("reports paymentsForbidden when payment currency is forbidden", () => {
    mockPaymentCurrencyForbidden = true;
    const { result } = renderHook(() => useCartPayment());

    expect(result.current.paymentsForbidden).toBe(true);
  });

  it("reports paymentsForbidden as false when neither is forbidden", () => {
    const { result } = renderHook(() => useCartPayment());

    expect(result.current.paymentsForbidden).toBe(false);
  });

  describe("BTC checkout recovery", () => {
    it("shows a recovery toast and deletes completed entries found on mount", async () => {
      getCompletedCheckouts.mockResolvedValue([{ paymentHash: "hash-1" }]);

      renderHook(() => useCartPayment());

      await waitFor(() => {
        expect(deleteCheckout).toHaveBeenCalledWith("hash-1");
      });
      expect(addToast).toHaveBeenCalledWith({
        color: "success",
        description: "success.btcRecovered",
      });
    });

    it("clears the cart when a background-synced checkout is recovered", async () => {
      getCompletedCheckouts.mockResolvedValue([{ paymentHash: "hash-bg" }]);
      const onResetCart = jest.fn();

      renderHook(() => useCartPayment({ onResetCart }));

      await waitFor(() => {
        expect(deleteCheckout).toHaveBeenCalledWith("hash-bg");
      });
      expect(onResetCart).toHaveBeenCalledTimes(1);
    });

    it("marks a pending checkout completed when the order was already recorded", async () => {
      getPendingCheckouts.mockResolvedValue([
        { paymentHash: "hash-2", checkoutPayload: { userId: "u1", items: [], amount: 10 } },
      ]);
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({
        status: "completed",
        orderId: "order-2",
        ticketId: "ticket-2",
        paymentId: "payment-2",
      });

      renderHook(() => useCartPayment());

      await waitFor(() => {
        expect(deleteCheckout).toHaveBeenCalledWith("hash-2");
      });

      expect(httpClient).toHaveBeenCalledWith("store/orders/payment-status/hash-2");
      expect(markCheckoutCompleted).toHaveBeenCalledWith("hash-2", {
        status: "completed",
        orderId: "order-2",
        ticketId: "ticket-2",
        paymentId: "payment-2",
      });
      expect(addToast).toHaveBeenCalledWith({
        color: "success",
        description: "success.btcRecovered",
      });
    });

    it("checks out a pending payment that phoenix confirms as paid and marks it completed", async () => {
      const checkoutPayload = { userId: "u1", items: [], amount: 10, paymentHash: "hash-3" };
      getPendingCheckouts.mockResolvedValue([
        { paymentHash: "hash-3", checkoutPayload },
      ]);
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse
        .mockResolvedValueOnce({ status: "paid" })
        .mockResolvedValueOnce({ orderId: "order-3" });

      renderHook(() => useCartPayment());

      await waitFor(() => {
        expect(deleteCheckout).toHaveBeenCalledWith("hash-3");
      });

      expect(httpClient).toHaveBeenCalledWith("store/orders/payment-status/hash-3");
      expect(httpClient).toHaveBeenCalledWith("store/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload),
      });
      expect(markCheckoutCompleted).toHaveBeenCalledWith("hash-3", { orderId: "order-3" });
      expect(addToast).toHaveBeenCalledWith({
        color: "success",
        description: "success.btcRecovered",
      });
    });

    it("leaves a pending checkout untouched when it has not been paid yet", async () => {
      getPendingCheckouts.mockResolvedValue([
        { paymentHash: "hash-4", checkoutPayload: {} },
      ]);
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ status: "pending" });

      renderHook(() => useCartPayment());

      await waitFor(() => {
        expect(httpClient).toHaveBeenCalled();
      });

      expect(markCheckoutCompleted).not.toHaveBeenCalled();
      expect(deleteCheckout).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalled();
    });

    it("silently skips recovery when the checkout store is unavailable", async () => {
      getCompletedCheckouts.mockRejectedValue(new Error("IndexedDB unavailable"));

      const { result } = renderHook(() => useCartPayment());

      await waitFor(() => {
        expect(getCompletedCheckouts).toHaveBeenCalled();
      });

      expect(getPendingCheckouts).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalled();
      expect(typeof result.current.handlePay).toBe("function");
    });
  });
});
