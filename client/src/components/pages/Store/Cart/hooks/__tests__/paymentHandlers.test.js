import { addToast } from "@heroui/react";

import { processCheckout } from "../paymentFlows";
import {
  buildHandlePay,
  buildHandleBtcInvoiceReady,
  buildHandleBtcComplete,
  buildHandleCashComplete,
  buildHandleCardComplete,
} from "../paymentHandlers";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("../paymentFlows", () => ({
  processCheckout: jest.fn(),
}));

describe("paymentHandlers", () => {
  const t = (key) => key;

  beforeEach(() => {
    addToast.mockClear();
    processCheckout.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("notifies error when cart validation fails", async () => {
    const notifyError = jest.fn();
    const dispatch = jest.fn();
    const ensureCartReady = jest.fn(() => {
      throw new Error("errors.selectMethod");
    });

    const handlePay = buildHandlePay({
      t,
      currency: { id: "cur-1" },
      formatAmount: jest.fn(),
      paymentMethodMap: {},
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig: jest.fn(),
      setCardPaymentConfig: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError,
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady,
      normalizeAmounts: jest.fn(),
    });

    await handlePay({ items: [], selectedPaymentMethod: "" });
    expect(notifyError).toHaveBeenCalledWith("errors.selectMethod");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("configures BTC payment when method is BTC", async () => {
    const setBtcPaymentConfig = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
      t,
      currency: { id: "cur-1", acronym: "MXN" },
      formatAmount: jest.fn(() => 100),
      paymentMethodMap: { btc: { id: "btc", name: "BTC" } },
      getPaymentCurrencyById: jest.fn(() => Promise.resolve({ acronym: "USD" })),
      setBtcPaymentConfig,
      setCashPaymentConfig: jest.fn(),
      setCardPaymentConfig: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError: jest.fn(),
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: 100,
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
    });

    await handlePay({
      items: [{ id: 1 }],
      subtotal: 100,
      total: 100,
      selectedPaymentMethod: "btc",
    });

    expect(setBtcPaymentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        amountFiat: 1,
        currencyAcronym: "usd",
        displayTotal: 100,
        items: [{ id: 1 }],
        selectedPaymentMethod: "btc",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("configures cash payment when method is cash", async () => {
    const setCashPaymentConfig = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
      t,
      currency: { id: "cur-1" },
      formatAmount: jest.fn(() => 100),
      paymentMethodMap: { cash: { id: "cash", name: "Cash" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig,
      setCardPaymentConfig: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError: jest.fn(),
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: 100,
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
    });

    await handlePay({
      items: [{ id: 1 }],
      subtotal: 100,
      total: 100,
      selectedPaymentMethod: "cash",
    });

    expect(setCashPaymentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        amountDue: 1,
        displayTotal: 100,
        items: [{ id: 1 }],
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("configures card payment when method is card", async () => {
    const setCardPaymentConfig = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
      t,
      currency: { id: "cur-1" },
      formatAmount: jest.fn(() => 100),
      paymentMethodMap: { card: { id: "card", name: "Card" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig: jest.fn(),
      setCardPaymentConfig,
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError: jest.fn(),
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: 100,
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
    });

    await handlePay({
      items: [{ id: 1 }],
      subtotal: 100,
      total: 100,
      selectedPaymentMethod: "card",
    });

    expect(setCardPaymentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        amountDue: 1,
        displayTotal: 100,
        items: [{ id: 1 }],
        selectedPaymentMethod: "card",
        currencyId: "cur-1",
        methodLabel: "Card",
      }),
    );
    expect(addToast).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("notifies error when base payment processing fails", async () => {
    const notifyError = jest.fn();
    const dispatch = jest.fn();
    processCheckout.mockRejectedValueOnce(new Error("boom"));

    const handlePay = buildHandlePay({
      t,
      currency: { id: "cur-1" },
      formatAmount: jest.fn(() => 100),
      paymentMethodMap: { bank: { id: "bank", name: "Bank Transfer" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig: jest.fn(),
      setCardPaymentConfig: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError,
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: 100,
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
    });

    await handlePay({
      items: [{ id: 1 }],
      subtotal: 100,
      total: 100,
      selectedPaymentMethod: "bank",
    });

    expect(notifyError).toHaveBeenCalledWith("boom");
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("updates BTC invoice config on invoice ready", () => {
    const setBtcPaymentConfig = jest.fn((fn) => fn({ existing: true }));
    const handle = buildHandleBtcInvoiceReady({ setBtcPaymentConfig });

    handle({ invoice: "inv" });
    expect(setBtcPaymentConfig).toHaveBeenCalled();
  });

  it("returns early when BTC config is missing", async () => {
    const dispatch = jest.fn();
    const handler = buildHandleBtcComplete({
      btcPaymentConfig: null,
      dispatch,
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError: jest.fn(),
      t,
      user: { user_id: "u1" },
      setBtcPaymentConfig: jest.fn(),
      printCustomerReceipt: jest.fn(),
    });

    await handler({ invoice: { serialized: "ln" } });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("completes BTC payment flow", async () => {
    const dispatch = jest.fn();
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const setBtcPaymentConfig = jest.fn((fn) => fn({ paymentCompleted: false }));

    processCheckout.mockResolvedValueOnce({
      order_id: "order-1",
      ticket_id: "ticket-1",
      payment_id: "pay-1",
    });

    const handler = buildHandleBtcComplete({
      btcPaymentConfig: {
        amountFiat: 1,
        selectedPaymentMethod: "btc",
        currencyId: "cur-1",
        items: [{ id: 1 }],
        subtotal: 1,
        discount: 0,
        discountAmount: 0,
        total: 1,
      },
      dispatch,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      t,
      user: { user_id: "u1" },
      setBtcPaymentConfig,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
    });

    await handler({ invoice: { serialized: "ln" } });

    expect(processCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: "ln" }),
    );
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: "order-1" }),
    );
    expect(onResetCart).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith({
      color: "success",
      description: "success.btcPaid",
    });
  });

  it("notifies error when BTC payment fails", async () => {
    const notifyError = jest.fn();
    const setBtcPaymentConfig = jest.fn((fn) => fn({ paymentCompleted: false }));

    processCheckout.mockRejectedValueOnce(new Error("errors.checkout"));

    const handler = buildHandleBtcComplete({
      btcPaymentConfig: {
        amountFiat: 1,
        selectedPaymentMethod: "btc",
        currencyId: "cur-1",
        items: [{ id: 1 }],
        subtotal: 1,
        discount: 0,
        discountAmount: 0,
        total: 1,
      },
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError,
      t,
      user: { user_id: "u1" },
      setBtcPaymentConfig,
      printCustomerReceipt: jest.fn(),
    });

    await handler({ invoice: { serialized: "ln" } });

    expect(notifyError).toHaveBeenCalledWith("errors.checkout");
    expect(setBtcPaymentConfig).toHaveBeenCalled();
  });

  it("completes cash payment flow", async () => {
    const dispatch = jest.fn();
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const setCashPaymentConfig = jest.fn();

    processCheckout.mockResolvedValueOnce({
      order_id: "order-1",
      ticket_id: "ticket-1",
      payment_id: "pay-1",
    });

    const handler = buildHandleCashComplete({
      cashPaymentConfig: {
        amountDue: 1,
        displayTotal: 100,
        items: [{ id: 1 }],
        amounts: {
          amountFiat: 1,
          displayTotal: 100,
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      },
      dispatch,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      t,
      setCashPaymentConfig,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { user_id: "u1" },
    });

    await handler({ cashReceived: 10, change: 2 });

    expect(processCheckout).toHaveBeenCalled();
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: "order-1", cashReceived: 10, change: 2 }),
    );
    expect(onResetCart).toHaveBeenCalled();
    expect(setCashPaymentConfig).toHaveBeenCalledWith(null);
    expect(addToast).toHaveBeenCalledWith({
      color: "success",
      description: "success.cashPaid",
    });
  });

  it("notifies error when cash payment fails", async () => {
    const notifyError = jest.fn();
    const setCashPaymentConfig = jest.fn();

    processCheckout.mockRejectedValueOnce(new Error("fail"));

    const handler = buildHandleCashComplete({
      cashPaymentConfig: {
        amountDue: 1,
        displayTotal: 100,
        items: [{ id: 1 }],
        amounts: {
          amountFiat: 1,
          displayTotal: 100,
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      },
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError,
      t,
      setCashPaymentConfig,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { user_id: "u1" },
    });

    await handler({ cashReceived: 10, change: 2 });

    expect(notifyError).toHaveBeenCalledWith("fail");
    expect(setCashPaymentConfig).toHaveBeenCalledWith(null);
  });

  it("completes card payment flow", async () => {
    const dispatch = jest.fn();
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const setCardPaymentConfig = jest.fn();

    processCheckout.mockResolvedValueOnce({
      order_id: "order-1",
      ticket_id: "ticket-1",
      payment_id: "pay-1",
    });

    const handler = buildHandleCardComplete({
      cardPaymentConfig: {
        amountDue: 1,
        displayTotal: 100,
        items: [{ id: 1 }],
        amounts: {
          amountFiat: 1,
          displayTotal: 100,
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "card",
        currencyId: "cur-1",
        methodLabel: "Credit Card",
      },
      dispatch,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      t,
      setCardPaymentConfig,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { user_id: "u1" },
    });

    await handler();

    expect(processCheckout).toHaveBeenCalled();
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: "order-1", methodLabel: "Credit Card" }),
    );
    expect(onResetCart).toHaveBeenCalled();
    expect(setCardPaymentConfig).toHaveBeenCalledWith(null);
    expect(addToast).toHaveBeenCalledWith({
      color: "success",
      description: "success.cardPaid",
    });
  });

  it("notifies error when card payment fails", async () => {
    const notifyError = jest.fn();
    const setCardPaymentConfig = jest.fn();

    processCheckout.mockRejectedValueOnce(new Error("fail"));

    const handler = buildHandleCardComplete({
      cardPaymentConfig: {
        amountDue: 1,
        displayTotal: 100,
        items: [{ id: 1 }],
        amounts: {
          amountFiat: 1,
          displayTotal: 100,
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "card",
        currencyId: "cur-1",
        methodLabel: "Credit Card",
      },
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError,
      t,
      setCardPaymentConfig,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { user_id: "u1" },
    });

    await handler();

    expect(notifyError).toHaveBeenCalledWith("fail");
    expect(setCardPaymentConfig).toHaveBeenCalledWith(null);
  });
});
