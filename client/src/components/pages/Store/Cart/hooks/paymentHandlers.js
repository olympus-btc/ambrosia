import {
  classifyPaymentMethod,
  PAYMENT_METHODS,
} from "../utils/paymentMethods";

import { processCheckout } from "./paymentFlows";

function buildInvoiceDescription(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";

  const lines = items
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      if (!name) return null;
      const quantity = Number(item?.quantity) || 1;
      return `${quantity}x ${name}`;
    })
    .filter(Boolean);

  return lines.join(", ");
}

export function buildHandlePay({
  currency,
  formatAmount,
  paymentMethodMap,
  getPaymentCurrencyById,
  setBtcPaymentConfig,
  setCashPaymentConfig,
  setCardPaymentConfig,
  onResetCart,
  onPay,
  notifyError,
  notifySuccess,
  dispatch,
  user,
  ensureCartReady,
  normalizeAmounts,
  printCustomerReceipt,
  refreshShiftTickets,
}) {
  return async function handlePay({
    items: cartItems = [],
    subtotal = 0,
    discount = 0,
    discountAmount = 0,
    total = 0,
    selectedPaymentMethod,
  }) {
    try {
      ensureCartReady({
        items: cartItems,
        selectedPaymentMethod,
        userId: user?.userId,
        currencyId: currency?.id,
      });
    } catch (err) {
      notifyError(err.message);
      return;
    }

    dispatch({ type: "start" });

    try {
      const currencyId = currency.id;
      const paymentAmounts = normalizeAmounts({ subtotal, discount, discountAmount, total, formatAmount });
      const paymentMethodData = paymentMethodMap[selectedPaymentMethod] || null;
      const paymentMethod = classifyPaymentMethod(paymentMethodData?.name || "");

      if (paymentMethod === PAYMENT_METHODS.BTC) {
        const currencyData = await getPaymentCurrencyById(currencyId);
        const currencyAcronym = (
          currencyData?.acronym ||
          currency?.acronym ||
          "MXN"
        ).toLowerCase();
        const invoiceDescription = buildInvoiceDescription(cartItems);

        setBtcPaymentConfig({
          paymentId: `btc-${Date.now()}`,
          amountFiat: paymentAmounts.amountFiat,
          currencyAcronym,
          displayTotal: paymentAmounts.displayTotal,
          subtotal: paymentAmounts.subtotal,
          discount: paymentAmounts.discount,
          discountAmount: paymentAmounts.discountAmount,
          total: paymentAmounts.total,
          cartItems,
          invoiceDescription,
          selectedPaymentMethod,
          currencyId,
        });
        return;
      }

      if (paymentMethod === PAYMENT_METHODS.CASH) {
        setCashPaymentConfig({
          amountDue: paymentAmounts.amountFiat,
          displayTotal: paymentAmounts.displayTotal,
          cartItems,
          paymentAmounts,
          selectedPaymentMethod,
          currencyId,
        });
        return;
      }

      if (paymentMethod === PAYMENT_METHODS.CARD) {
        setCardPaymentConfig({
          amountDue: paymentAmounts.amountFiat,
          displayTotal: paymentAmounts.displayTotal,
          cartItems,
          paymentAmounts,
          selectedPaymentMethod,
          currencyId,
          methodLabel: paymentMethodData?.name || "",
        });
        return;
      }

      const storeCheckoutResult = await processCheckout({
        cartItems,
        paymentAmounts,
        selectedPaymentMethod,
        currencyId,
        user,
      });

      await refreshShiftTickets?.();
      await printCustomerReceipt?.({
        items: cartItems,
        totalCents: paymentAmounts.total,
        ticketId: storeCheckoutResult.ticketId,
      });

      notifySuccess("success.paid");
      onResetCart?.();
      onPay?.({ items: cartItems, ...paymentAmounts, paymentMethod: selectedPaymentMethod, ...storeCheckoutResult });
    } catch (err) {
      console.error("Error processing payment:", err);
      notifyError(err?.message || "errors.process");
    } finally {
      dispatch({ type: "stop" });
    }
  };
}

export function buildHandleBtcInvoiceReady({ setBtcPaymentConfig }) {
  return (data) => {
    setBtcPaymentConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, invoiceData: data };
    });
  };
}

async function runDeferredCheckout({
  checkoutArgs,
  receiptItems,
  receiptTotal,
  receiptInvoice,
  buildOnPayPayload,
  successKey,
  errorKey,
  finalize,
  dispatch,
  onPay,
  onResetCart,
  notifyError,
  notifySuccess,
  user,
  printCustomerReceipt,
  refreshShiftTickets,
}) {
  dispatch({ type: "start" });
  try {
    const storeCheckoutResult = await processCheckout({ ...checkoutArgs, user });

    await refreshShiftTickets?.();
    await printCustomerReceipt?.({
      items: receiptItems,
      totalCents: receiptTotal,
      ticketId: storeCheckoutResult.ticketId,
      invoice: receiptInvoice,
    });

    onPay?.(buildOnPayPayload(storeCheckoutResult));
    onResetCart?.();
    notifySuccess(successKey);
  } catch (err) {
    console.error("Error completing payment:", err);
    notifyError(err?.message || errorKey);
  } finally {
    finalize();
    dispatch({ type: "stop" });
  }
}

export function buildHandleBtcComplete({ getConfig, setConfig, ...context }) {
  return async function handleBtcComplete(completionData) {
    const config = getConfig();
    if (!config) return;

    await runDeferredCheckout({
      ...context,
      checkoutArgs: {
        cartItems: config.cartItems,
        paymentAmounts: {
          amountFiat: config.amountFiat,
          subtotal: config.subtotal,
          discount: config.discount,
          discountAmount: config.discountAmount,
          total: config.total,
        },
        selectedPaymentMethod: config.selectedPaymentMethod,
        currencyId: config.currencyId,
        transactionId: completionData?.invoice?.serialized || "",
        satoshiAmount: completionData?.satoshis ?? null,
        exchangeRateAtPayment: config.invoiceData?.exchangeRate ?? null,
        paymentHash: completionData?.invoice?.paymentHash ?? null,
        exchangeRateCurrency: config.currencyAcronym ?? null,
        fiatAmountAtPayment: config.amountFiat ?? null,
      },
      receiptItems: config.cartItems,
      receiptTotal: config.total,
      receiptInvoice: completionData?.invoice?.serialized || "",
      buildOnPayPayload: (storeCheckoutResult) => ({
        items: config.cartItems,
        subtotal: config.subtotal,
        discount: config.discount,
        discountAmount: config.discountAmount,
        total: config.total,
        amount: config.amountFiat,
        paymentMethod: config.selectedPaymentMethod,
        ...storeCheckoutResult,
        ...completionData,
      }),
      successKey: "success.btcPaid",
      errorKey: "errors.btcComplete",
      finalize: () => setConfig((previousConfig) => (
        previousConfig ? { ...previousConfig, paymentCompleted: true } : previousConfig
      )),
    });
  };
}

export function buildHandleCashComplete({ getConfig, setConfig, ...context }) {
  return async function handleCashComplete(completionData) {
    const config = getConfig();
    if (!config) return;

    await runDeferredCheckout({
      ...context,
      checkoutArgs: {
        cartItems: config.cartItems || [],
        paymentAmounts: config.paymentAmounts,
        selectedPaymentMethod: config.selectedPaymentMethod,
        currencyId: config.currencyId,
      },
      receiptItems: config.cartItems,
      receiptTotal: config.paymentAmounts.total,
      buildOnPayPayload: (storeCheckoutResult) => ({
        items: config.cartItems,
        ...config.paymentAmounts,
        paymentMethod: config.selectedPaymentMethod,
        ...storeCheckoutResult,
        cashReceived: completionData?.cashReceived,
        change: completionData?.change,
      }),
      successKey: "success.cashPaid",
      errorKey: "errors.cashComplete",
      finalize: () => setConfig(null),
    });
  };
}

export function buildHandleCardComplete({ getConfig, setConfig, ...context }) {
  return async function handleCardComplete() {
    const config = getConfig();
    if (!config) return;

    await runDeferredCheckout({
      ...context,
      checkoutArgs: {
        cartItems: config.cartItems || [],
        paymentAmounts: config.paymentAmounts,
        selectedPaymentMethod: config.selectedPaymentMethod,
        currencyId: config.currencyId,
      },
      receiptItems: config.cartItems,
      receiptTotal: config.paymentAmounts.total,
      buildOnPayPayload: (storeCheckoutResult) => ({
        items: config.cartItems,
        ...config.paymentAmounts,
        paymentMethod: config.selectedPaymentMethod,
        ...storeCheckoutResult,
        methodLabel: config.methodLabel,
      }),
      successKey: "success.cardPaid",
      errorKey: "errors.cardComplete",
      finalize: () => setConfig(null),
    });
  };
}
