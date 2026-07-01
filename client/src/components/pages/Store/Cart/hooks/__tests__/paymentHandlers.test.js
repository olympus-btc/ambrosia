import {
  deleteCheckout,
  markCheckoutCompleted,
  registerBtcCheckoutSync,
  savePendingCheckout,
} from "@/lib/btcCheckoutStore";

import { processCheckout } from "../paymentFlows";
import {
  buildHandlePay,
  buildHandleBtcInvoiceReady,
  buildHandleBtcComplete,
  buildHandleCashComplete,
  buildHandleCardComplete,
} from "../paymentHandlers";

jest.mock("@/lib/btcCheckoutStore", () => ({
  savePendingCheckout: jest.fn(() => Promise.resolve()),
  registerBtcCheckoutSync: jest.fn(() => Promise.resolve()),
  markCheckoutCompleted: jest.fn(() => Promise.resolve()),
  deleteCheckout: jest.fn(() => Promise.resolve()),
}));

jest.mock("../paymentFlows", () => ({
  processCheckout: jest.fn(),
}));

describe("paymentHandlers", () => {
  beforeEach(() => {
    processCheckout.mockReset();
    savePendingCheckout.mockClear();
    registerBtcCheckoutSync.mockClear();
    markCheckoutCompleted.mockClear();
    deleteCheckout.mockClear();
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
      user: { userId: "u1" },
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
      user: { userId: "u1" },
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
        cartItems: [{ id: 1 }],
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
      user: { userId: "u1" },
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
        cartItems: [{ id: 1 }],
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("configures card payment when method is card", async () => {
    const setCardPaymentConfig = jest.fn();
    const notifySuccess = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
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
      notifySuccess,
      dispatch,
      user: { userId: "u1" },
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
        cartItems: [{ id: 1 }],
        selectedPaymentMethod: "card",
        currencyId: "cur-1",
        methodLabel: "Card",
      }),
    );
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("configures cash payment when method name is 'efectivo'", async () => {
    const setCashPaymentConfig = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
      currency: { id: "cur-1" },
      formatAmount: jest.fn(() => 100),
      paymentMethodMap: { efectivo: { id: "efectivo", name: "Efectivo" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig,
      setCardPaymentConfig: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError: jest.fn(),
      dispatch,
      user: { userId: "u1" },
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
      selectedPaymentMethod: "efectivo",
    });

    expect(setCashPaymentConfig).toHaveBeenCalledWith(
      expect.objectContaining({ selectedPaymentMethod: "efectivo" }),
    );
    expect(processCheckout).not.toHaveBeenCalled();
  });

  it("configures card payment when method name includes 'debit'", async () => {
    const setCardPaymentConfig = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
      currency: { id: "cur-1" },
      formatAmount: jest.fn(() => 100),
      paymentMethodMap: { debit: { id: "debit", name: "Debit Card" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig: jest.fn(),
      setCardPaymentConfig,
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError: jest.fn(),
      dispatch,
      user: { userId: "u1" },
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
      selectedPaymentMethod: "debit",
    });

    expect(setCardPaymentConfig).toHaveBeenCalledWith(
      expect.objectContaining({ selectedPaymentMethod: "debit", methodLabel: "Debit Card" }),
    );
    expect(processCheckout).not.toHaveBeenCalled();
  });

  it("notifies error when base payment processing fails", async () => {
    const notifyError = jest.fn();
    const dispatch = jest.fn();
    processCheckout.mockRejectedValueOnce(new Error("boom"));

    const handlePay = buildHandlePay({
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
      user: { userId: "u1" },
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

  it("stores exchangeRate in btcPaymentConfig on invoice ready", () => {
    let captured = { existing: true };
    const setBtcPaymentConfig = jest.fn((fn) => {
      captured = fn(captured);
    });
    const handle = buildHandleBtcInvoiceReady({ setBtcPaymentConfig });

    handle({ invoice: { serialized: "ln", paymentHash: "hash-1" }, satoshis: 20000, paymentId: "pay-1", exchangeRate: 50000 });

    expect(captured.invoiceData).toEqual(
      expect.objectContaining({ exchangeRate: 50000, satoshis: 20000 }),
    );
  });

  it("saves a pending checkout and registers sync when the invoice has a paymentHash", () => {
    let captured = {
      userId: "user-1",
      cartItems: [{ id: "prod-1", quantity: 2, price: 500 }],
      selectedPaymentMethod: "btc",
      currencyId: "cur-1",
      amountFiat: 10,
      currencyAcronym: "mxn",
    };
    const setBtcPaymentConfig = jest.fn((fn) => {
      captured = fn(captured);
    });
    const handle = buildHandleBtcInvoiceReady({ setBtcPaymentConfig });

    handle({
      invoice: { serialized: "ln-invoice", paymentHash: "hash-1" },
      satoshis: 20000,
      exchangeRate: 50000,
    });

    expect(savePendingCheckout).toHaveBeenCalledWith({
      paymentHash: "hash-1",
      checkoutPayload: expect.objectContaining({
        paymentHash: "hash-1",
        userId: "user-1",
        items: [{ productId: "prod-1", variantId: null, quantity: 2, priceAtOrder: 500 }],
        paymentMethodId: "btc",
        currencyId: "cur-1",
        amount: 10,
        discountAmount: 0,
        transactionId: "ln-invoice",
        satoshiAmount: 20000,
        exchangeRateAtPayment: 50000,
        exchangeRateCurrency: "mxn",
        fiatAmountAtPayment: 10,
      }),
    });
    expect(registerBtcCheckoutSync).toHaveBeenCalled();
  });

  it("does not persist a pending checkout when the invoice has no paymentHash", () => {
    let captured = { userId: "user-1", cartItems: [{ id: "prod-1", quantity: 1, price: 500 }] };
    const setBtcPaymentConfig = jest.fn((fn) => {
      captured = fn(captured);
    });
    const handle = buildHandleBtcInvoiceReady({ setBtcPaymentConfig });

    handle({ invoice: { serialized: "ln-invoice" }, satoshis: 20000 });

    expect(savePendingCheckout).not.toHaveBeenCalled();
    expect(registerBtcCheckoutSync).not.toHaveBeenCalled();
  });

  it("returns early when BTC config is missing", async () => {
    const dispatch = jest.fn();
    const handler = buildHandleBtcComplete({
      getConfig: () => null,
      setConfig: jest.fn(),
      dispatch,
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError: jest.fn(),
      user: { userId: "u1" },
      printCustomerReceipt: jest.fn(),
    });

    await handler({ invoice: { serialized: "ln" } });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("completes BTC payment flow", async () => {
    const dispatch = jest.fn();
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const notifySuccess = jest.fn();
    const setBtcPaymentConfig = jest.fn((fn) => fn({ paymentCompleted: false }));

    processCheckout.mockResolvedValueOnce({
      orderId: "order-1",
      ticketId: "ticket-1",
      paymentId: "pay-1",
    });

    const handler = buildHandleBtcComplete({
      getConfig: () => ({
        amountFiat: 1,
        selectedPaymentMethod: "btc",
        currencyId: "cur-1",
        cartItems: [{ id: 1 }],
        subtotal: 1,
        discount: 0,
        discountAmount: 0,
        total: 1,
        invoiceData: { exchangeRate: 50000, satoshis: 20000 },
      }),
      setConfig: setBtcPaymentConfig,
      dispatch,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      notifySuccess,
      user: { userId: "u1" },
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
    });

    await handler({ invoice: { serialized: "ln", paymentHash: "hash-1" }, satoshis: 20000 });

    expect(processCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "ln",
        satoshiAmount: 20000,
        exchangeRateAtPayment: 50000,
        paymentHash: "hash-1",
      }),
    );
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-1" }),
    );
    expect(onResetCart).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith("success.btcPaid");
  });

  it("marks the recovery store entry completed on BTC payment success", async () => {
    const setBtcPaymentConfig = jest.fn((fn) => fn({ paymentCompleted: false }));
    const checkoutResult = { orderId: "order-1", ticketId: "ticket-1", paymentId: "pay-1" };

    processCheckout.mockResolvedValueOnce(checkoutResult);

    const handler = buildHandleBtcComplete({
      getConfig: () => ({
        amountFiat: 1,
        selectedPaymentMethod: "btc",
        currencyId: "cur-1",
        cartItems: [{ id: 1 }],
        subtotal: 1,
        discount: 0,
        discountAmount: 0,
        total: 1,
        invoiceData: { exchangeRate: 50000, satoshis: 20000 },
      }),
      setConfig: setBtcPaymentConfig,
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError: jest.fn(),
      user: { userId: "u1" },
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
    });

    await handler({ invoice: { serialized: "ln", paymentHash: "hash-1" }, satoshis: 20000 });

    expect(markCheckoutCompleted).toHaveBeenCalledWith("hash-1", checkoutResult);
    expect(deleteCheckout).toHaveBeenCalledWith("hash-1");
  });

  it("resets the cart without an error toast when the BTC payment is still pending confirmation", async () => {
    const notifyError = jest.fn();
    const notifySuccess = jest.fn();
    const onResetCart = jest.fn();
    const setBtcPaymentConfig = jest.fn((fn) => fn({ paymentCompleted: false }));

    processCheckout.mockResolvedValueOnce({ pending: true });

    const handler = buildHandleBtcComplete({
      getConfig: () => ({
        amountFiat: 1,
        selectedPaymentMethod: "btc",
        currencyId: "cur-1",
        cartItems: [{ id: 1 }],
        subtotal: 1,
        discount: 0,
        discountAmount: 0,
        total: 1,
        invoiceData: { exchangeRate: 50000, satoshis: 20000 },
      }),
      setConfig: setBtcPaymentConfig,
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart,
      notifyError,
      notifySuccess,
      user: { userId: "u1" },
      printCustomerReceipt: jest.fn(),
    });

    await handler({ invoice: { serialized: "ln", paymentHash: "hash-1" }, satoshis: 20000 });

    expect(notifyError).not.toHaveBeenCalled();
    expect(onResetCart).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith("success.btcConfirming");
    expect(setBtcPaymentConfig).toHaveBeenCalled();
  });

  it("notifies error when BTC payment fails", async () => {
    const notifyError = jest.fn();
    const setBtcPaymentConfig = jest.fn((fn) => fn({ paymentCompleted: false }));

    processCheckout.mockRejectedValueOnce(new Error("errors.checkout"));

    const handler = buildHandleBtcComplete({
      getConfig: () => ({
        amountFiat: 1,
        selectedPaymentMethod: "btc",
        currencyId: "cur-1",
        cartItems: [{ id: 1 }],
        subtotal: 1,
        discount: 0,
        discountAmount: 0,
        total: 1,
        invoiceData: { exchangeRate: 50000, satoshis: 20000 },
      }),
      setConfig: setBtcPaymentConfig,
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError,
      user: { userId: "u1" },
      printCustomerReceipt: jest.fn(),
    });

    await handler({ invoice: { serialized: "ln", paymentHash: "hash-1" }, satoshis: 20000 });

    expect(notifyError).toHaveBeenCalledWith("errors.checkout");
    expect(setBtcPaymentConfig).toHaveBeenCalled();
  });

  it("completes cash payment flow", async () => {
    const dispatch = jest.fn();
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const notifySuccess = jest.fn();
    const setCashPaymentConfig = jest.fn();

    processCheckout.mockResolvedValueOnce({
      orderId: "order-1",
      ticketId: "ticket-1",
      paymentId: "pay-1",
    });

    const handler = buildHandleCashComplete({
      getConfig: () => ({
        amountDue: 1,
        displayTotal: 100,
        cartItems: [{ id: 1 }],
        paymentAmounts: {
          amountFiat: 1,
          displayTotal: 100,
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      }),
      setConfig: setCashPaymentConfig,
      dispatch,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      notifySuccess,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { userId: "u1" },
    });

    await handler({ cashReceived: 10, change: 2 });

    expect(processCheckout).toHaveBeenCalled();
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-1", cashReceived: 10, change: 2 }),
    );
    expect(onResetCart).toHaveBeenCalled();
    expect(setCashPaymentConfig).toHaveBeenCalledWith(null);
    expect(notifySuccess).toHaveBeenCalledWith("success.cashPaid");
  });

  it("notifies error when cash payment fails", async () => {
    const notifyError = jest.fn();
    const setCashPaymentConfig = jest.fn();

    processCheckout.mockRejectedValueOnce(new Error("fail"));

    const handler = buildHandleCashComplete({
      getConfig: () => ({
        amountDue: 1,
        displayTotal: 100,
        cartItems: [{ id: 1 }],
        paymentAmounts: {
          amountFiat: 1,
          displayTotal: 100,
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      }),
      setConfig: setCashPaymentConfig,
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { userId: "u1" },
    });

    await handler({ cashReceived: 10, change: 2 });

    expect(notifyError).toHaveBeenCalledWith("fail");
    expect(setCashPaymentConfig).toHaveBeenCalledWith(null);
  });

  it("completes card payment flow", async () => {
    const dispatch = jest.fn();
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const notifySuccess = jest.fn();
    const setCardPaymentConfig = jest.fn();

    processCheckout.mockResolvedValueOnce({
      orderId: "order-1",
      ticketId: "ticket-1",
      paymentId: "pay-1",
    });

    const handler = buildHandleCardComplete({
      getConfig: () => ({
        amountDue: 1,
        displayTotal: 100,
        cartItems: [{ id: 1 }],
        paymentAmounts: {
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
      }),
      setConfig: setCardPaymentConfig,
      dispatch,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      notifySuccess,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { userId: "u1" },
    });

    await handler();

    expect(processCheckout).toHaveBeenCalled();
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-1", methodLabel: "Credit Card" }),
    );
    expect(onResetCart).toHaveBeenCalled();
    expect(setCardPaymentConfig).toHaveBeenCalledWith(null);
    expect(notifySuccess).toHaveBeenCalledWith("success.cardPaid");
  });

  it("notifies error when card payment fails", async () => {
    const notifyError = jest.fn();
    const setCardPaymentConfig = jest.fn();

    processCheckout.mockRejectedValueOnce(new Error("fail"));

    const handler = buildHandleCardComplete({
      getConfig: () => ({
        amountDue: 1,
        displayTotal: 100,
        cartItems: [{ id: 1 }],
        paymentAmounts: {
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
      }),
      setConfig: setCardPaymentConfig,
      dispatch: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { userId: "u1" },
    });

    await handler();

    expect(notifyError).toHaveBeenCalledWith("fail");
    expect(setCardPaymentConfig).toHaveBeenCalledWith(null);
  });
});
