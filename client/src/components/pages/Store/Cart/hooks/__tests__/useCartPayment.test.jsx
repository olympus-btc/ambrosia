import { act } from "react";

import { waitFor, renderHook } from "@testing-library/react";

import { useCartPayment } from "../useCartPayment";

let mockPaymentMethods;

jest.mock("@/modules/auth/useAuth", () => ({
  useAuth: () => ({ user: { user_id: "u1", name: "Tester" } }),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { id: "cur-1", acronym: "MXN" },
    formatAmount: (value) => `fmt-${value}`,
  }),
}));

jest.mock("../usePaymentMethod", () => ({
  usePaymentMethods: () => ({
    paymentMethods: mockPaymentMethods,
  }),
}));

jest.mock("../../../hooks/useOrders", () => ({
  useOrders: () => ({
    createOrder: jest.fn(() => Promise.resolve({ id: "order-1" })),
    updateOrder: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock("../../../hooks/usePayments", () => ({
  usePayments: () => ({
    createPayment: jest.fn(() => Promise.resolve({ id: "pay-1" })),
    linkPaymentToTicket: jest.fn(() => Promise.resolve()),
    getPaymentCurrencyById: jest.fn(() => Promise.resolve({ acronym: "USD" })),
  }),
}));

jest.mock("../../../hooks/useTickets", () => ({
  useTickets: () => ({
    createTicket: jest.fn(() => Promise.resolve({ id: "ticket-1" })),
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
      expect(result.current.btcPaymentConfig).toEqual(
        expect.objectContaining({
          amountFiat: 1,
          currencyAcronym: "usd",
          displayTotal: "fmt-100",
          selectedPaymentMethod: "btc",
        }),
      );
    });

    act(() => {
      result.current.clearBtcPaymentConfig();
    });

    expect(result.current.btcPaymentConfig).toBeNull();
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
      expect(result.current.cashPaymentConfig).toEqual(
        expect.objectContaining({
          amountDue: 1,
          displayTotal: "fmt-100",
        }),
      );
    });

    act(() => {
      result.current.clearCashPaymentConfig();
    });

    expect(result.current.cashPaymentConfig).toBeNull();
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
      expect(result.current.cardPaymentConfig).toEqual(
        expect.objectContaining({
          amountDue: 1,
          displayTotal: "fmt-100",
          methodLabel: "Credit Card",
        }),
      );
    });

    act(() => {
      result.current.clearCardPaymentConfig();
    });

    expect(result.current.cardPaymentConfig).toBeNull();
  });

  it("handles missing payment methods without crashing", () => {
    mockPaymentMethods = undefined;
    const { result } = renderHook(() => useCartPayment());

    expect(typeof result.current.handlePay).toBe("function");
  });
});
