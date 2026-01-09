import { addToast } from "@heroui/react";

import {
  buildHandlePay,
  buildHandleBtcInvoiceReady,
  buildHandleBtcComplete,
  buildHandleCashComplete,
} from "../paymentHandlers";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

describe("paymentHandlers", () => {
  const t = (key) => key;

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
      processBasePayment: jest.fn(),
      updateOrder: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError,
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady,
      normalizeAmounts: jest.fn(),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
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
      formatAmount: jest.fn(() => "fmt-100"),
      paymentMethodMap: { btc: { id: "btc", name: "BTC" } },
      getPaymentCurrencyById: jest.fn(() => Promise.resolve({ acronym: "USD" })),
      setBtcPaymentConfig,
      setCashPaymentConfig: jest.fn(),
      processBasePayment: jest.fn(),
      updateOrder: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError: jest.fn(),
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: "fmt-100",
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
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
        displayTotal: "fmt-100",
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
      formatAmount: jest.fn(() => "fmt-100"),
      paymentMethodMap: { cash: { id: "cash", name: "Cash" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig,
      processBasePayment: jest.fn(),
      updateOrder: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError: jest.fn(),
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: "fmt-100",
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
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
        displayTotal: "fmt-100",
        items: [{ id: 1 }],
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("updates order and completes payment for non-cash methods", async () => {
    const updateOrder = jest.fn(() => Promise.resolve());
    const onResetCart = jest.fn();
    const onPay = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
      t,
      currency: { id: "cur-1" },
      formatAmount: jest.fn(() => "fmt-100"),
      paymentMethodMap: { card: { id: "card", name: "Card" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig: jest.fn(),
      processBasePayment: jest.fn(() => Promise.resolve({
        paymentResult: { paymentId: "pay-1" },
        orderPayload: { id: "order-1" },
        orderId: "order-1",
      })),
      updateOrder,
      onResetCart,
      onPay,
      notifyError: jest.fn(),
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: "fmt-100",
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
    });

    await handlePay({
      items: [{ id: 1 }],
      subtotal: 100,
      total: 100,
      selectedPaymentMethod: "card",
    });

    expect(updateOrder).toHaveBeenCalledWith("order-1", {
      id: "order-1",
      status: "paid",
    });
    expect(onResetCart).toHaveBeenCalled();
    expect(onPay).toHaveBeenCalledWith({ paymentId: "pay-1" });
    expect(addToast).toHaveBeenCalledWith({
      color: "success",
      description: "success.paid",
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "start" });
    expect(dispatch).toHaveBeenCalledWith({ type: "stop" });
  });

  it("notifies error when base payment processing fails", async () => {
    const notifyError = jest.fn();
    const dispatch = jest.fn();

    const handlePay = buildHandlePay({
      t,
      currency: { id: "cur-1" },
      formatAmount: jest.fn(() => "fmt-100"),
      paymentMethodMap: { card: { id: "card", name: "Card" } },
      getPaymentCurrencyById: jest.fn(),
      setBtcPaymentConfig: jest.fn(),
      setCashPaymentConfig: jest.fn(),
      processBasePayment: jest.fn(() => {
        throw new Error("boom");
      }),
      updateOrder: jest.fn(),
      onResetCart: jest.fn(),
      onPay: jest.fn(),
      notifyError,
      dispatch,
      user: { user_id: "u1" },
      ensureCartReady: jest.fn(),
      normalizeAmounts: jest.fn(() => ({
        amountFiat: 1,
        displayTotal: "fmt-100",
        subtotal: 100,
        discount: 0,
        discountAmount: 0,
        total: 100,
      })),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
    });

    await handlePay({
      items: [{ id: 1 }],
      subtotal: 100,
      total: 100,
      selectedPaymentMethod: "card",
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
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError: jest.fn(),
      t,
      user: { user_id: "u1" },
      setBtcPaymentConfig: jest.fn(),
    });

    await handler({ invoice: { serialized: "ln" } });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("completes BTC payment flow", async () => {
    const dispatch = jest.fn();
    const createPayment = jest.fn(() => Promise.resolve({ id: "pay-1" }));
    const linkPaymentToTicket = jest.fn(() => Promise.resolve());
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const setBtcPaymentConfig = jest.fn((fn) => fn({ paymentCompleted: false }));

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
      createOrderAndTicketFn: jest.fn(() => Promise.resolve({ orderId: "order-1", ticketId: "ticket-1" })),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      buildPaymentPayload: jest.fn(({ transactionId }) => ({ transaction_id: transactionId })),
      createPayment,
      linkPaymentToTicket,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      t,
      user: { user_id: "u1" },
      setBtcPaymentConfig,
    });

    await handler({ invoice: { serialized: "ln" } });

    expect(createPayment).toHaveBeenCalledWith({ transaction_id: "ln" });
    expect(linkPaymentToTicket).toHaveBeenCalledWith("pay-1", "ticket-1");
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay-1", orderId: "order-1" }),
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
      createOrderAndTicketFn: jest.fn(() => Promise.resolve({ orderId: "order-1", ticketId: "ticket-1" })),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createPayment: jest.fn(() => Promise.resolve({})),
      linkPaymentToTicket: jest.fn(),
      onPay: jest.fn(),
      onResetCart: jest.fn(),
      notifyError,
      t,
      user: { user_id: "u1" },
      setBtcPaymentConfig,
    });

    await handler({ invoice: { serialized: "ln" } });

    expect(notifyError).toHaveBeenCalledWith("errors.createPayment");
    expect(setBtcPaymentConfig).toHaveBeenCalled();
  });

  it("completes cash payment flow", async () => {
    const dispatch = jest.fn();
    const processBasePayment = jest.fn(() => Promise.resolve({
      paymentResult: { paymentId: "pay-1", items: [{ id: 1 }], total: 100, ticketId: "ticket-1" },
      orderPayload: { id: "order-1" },
      orderId: "order-1",
    }));
    const updateOrder = jest.fn(() => Promise.resolve());
    const onPay = jest.fn();
    const onResetCart = jest.fn();
    const setCashPaymentConfig = jest.fn();

    const handler = buildHandleCashComplete({
      cashPaymentConfig: {
        amountDue: 1,
        displayTotal: "fmt-100",
        items: [{ id: 1 }],
        amounts: {
          amountFiat: 1,
          displayTotal: "fmt-100",
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      },
      dispatch,
      processBasePayment,
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
      updateOrder,
      onPay,
      onResetCart,
      notifyError: jest.fn(),
      t,
      setCashPaymentConfig,
      printCustomerReceipt: jest.fn(() => Promise.resolve()),
      user: { user_id: "u1" },
    });

    await handler({ cashReceived: 10, change: 2 });

    expect(processBasePayment).toHaveBeenCalled();
    expect(updateOrder).toHaveBeenCalledWith("order-1", {
      id: "order-1",
      status: "paid",
    });
    expect(onPay).toHaveBeenCalledWith(expect.objectContaining({
      paymentId: "pay-1",
      cashReceived: 10,
      change: 2,
    }));
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

    const handler = buildHandleCashComplete({
      cashPaymentConfig: {
        amountDue: 1,
        displayTotal: "fmt-100",
        items: [{ id: 1 }],
        amounts: {
          amountFiat: 1,
          displayTotal: "fmt-100",
          subtotal: 100,
          discount: 0,
          discountAmount: 0,
          total: 100,
        },
        selectedPaymentMethod: "cash",
        currencyId: "cur-1",
      },
      dispatch: jest.fn(),
      processBasePayment: jest.fn(() => Promise.resolve({
        paymentResult: { paymentId: "pay-1" },
        orderPayload: { id: "order-1" },
        orderId: "order-1",
      })),
      buildOrderPayload: jest.fn(),
      buildTicketPayload: jest.fn(),
      createOrder: jest.fn(),
      createTicket: jest.fn(),
      buildPaymentPayload: jest.fn(),
      createPayment: jest.fn(),
      linkPaymentToTicket: jest.fn(),
      updateOrder: jest.fn(() => Promise.reject(new Error("fail"))),
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
});
