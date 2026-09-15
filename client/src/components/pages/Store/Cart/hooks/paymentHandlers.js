import {
  deleteCheckout,
  markCheckoutCompleted,
  registerBtcCheckoutSync,
  savePendingCheckout,
} from "@/lib/btcCheckoutStore";

import { getCheckoutErrorDescription } from "../utils/checkoutErrors";
import {
  classifyPaymentMethod,
  PAYMENT_METHODS,
} from "../utils/paymentMethods";

import { processCheckout } from "./paymentFlows";

function logPaymentError(context, paymentError) {
  const errorDetails = {
    status: paymentError?.status,
    code: paymentError?.code,
    source: paymentError?.source,
    message: paymentError?.responseMessage || paymentError?.message,
  };

  if (paymentError?.status) {
    console.error(context, errorDetails);
    return;
  }

  console.error(context, paymentError);
}

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
  setTransferPaymentConfig,
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
    tip = 0,
    tipType = "percentage",
    tipAmount = 0,
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
    } catch (cartValidationError) {
      notifyError(cartValidationError.message);
      return;
    }

    dispatch({ type: "start" });

    try {
      const currencyId = currency.id;
      const paymentAmounts = normalizeAmounts({ subtotal, discount, discountAmount, tipAmount, total, formatAmount });
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
          tip,
          tipType,
          tipAmount: paymentAmounts.tipAmount,
          tipAmountFiat: paymentAmounts.tipAmountFiat,
          total: paymentAmounts.total,
          cartItems,
          invoiceDescription,
          selectedPaymentMethod,
          currencyId,
          userId: user.userId,
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

      if (paymentMethod === PAYMENT_METHODS.TRANSFER) {
        setTransferPaymentConfig({
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
        discountAmountCents: paymentAmounts.discountAmount,
        tipAmountCents: paymentAmounts.tipAmount,
        ticketId: storeCheckoutResult.ticketId,
      });

      notifySuccess("success.paid");
      onResetCart?.();
      onPay?.({ items: cartItems, ...paymentAmounts, paymentMethod: selectedPaymentMethod, ...storeCheckoutResult });
    } catch (paymentProcessingError) {
      logPaymentError("Error processing payment", paymentProcessingError);
      notifyError(getCheckoutErrorDescription(paymentProcessingError, "errors.process"));
    } finally {
      dispatch({ type: "stop" });
    }
  };
}

export function buildHandleBtcInvoiceReady({ setBtcPaymentConfig }) {
  return (invoiceReadyData) => {
    setBtcPaymentConfig((prevConfig) => {
      if (!prevConfig) return prevConfig;

      if (invoiceReadyData?.invoice?.paymentHash) {
        const checkoutPayload = {
          paymentHash: invoiceReadyData.invoice.paymentHash,
          userId: prevConfig.userId,
          items: (prevConfig.cartItems || []).map((item) => ({
            productId: String(item?.productId ?? item?.id ?? ""),
            variantId: item?.variantId ?? null,
            quantity: Number(item?.quantity) || 0,
            priceAtOrder: Number(item?.price) || 0,
          })),
          paymentMethodId: prevConfig.selectedPaymentMethod,
          currencyId: prevConfig.currencyId,
          amount: prevConfig.amountFiat,
          discountAmount: prevConfig.discountAmount ?? 0,
          tipAmount: prevConfig.tipAmountFiat ?? (prevConfig.tipAmount ? prevConfig.tipAmount / 100 : 0),
          transactionId: invoiceReadyData.invoice.serialized || "",
          satoshiAmount: invoiceReadyData.satoshis ?? null,
          exchangeRateAtPayment: invoiceReadyData.exchangeRate ?? null,
          exchangeRateCurrency: prevConfig.currencyAcronym ?? null,
          fiatAmountAtPayment: prevConfig.amountFiat ?? null,
        };
        savePendingCheckout({ paymentHash: invoiceReadyData.invoice.paymentHash, checkoutPayload }).catch(() => {});
        registerBtcCheckoutSync().catch(() => {});
      }

      return { ...prevConfig, invoiceData: invoiceReadyData };
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
  pendingKey,
  onCheckoutSuccess,
  finalize,
  dispatch,
  onPay,
  onResetCart,
  notifyError,
  notifySuccess,
  user,
  printCustomerReceipt,
  refreshShiftTickets,
  receiptDiscountAmount,
  receiptTipAmount,
}) {
  dispatch({ type: "start" });
  try {
    const storeCheckoutResult = await processCheckout({ ...checkoutArgs, user });

    if (storeCheckoutResult?.pending) {
      onResetCart?.();
      notifySuccess(pendingKey);
      return;
    }

    await onCheckoutSuccess?.(storeCheckoutResult);

    await refreshShiftTickets?.();
    await printCustomerReceipt?.({
      items: receiptItems,
      totalCents: receiptTotal,
      discountAmountCents: receiptDiscountAmount,
      tipAmountCents: receiptTipAmount,
      ticketId: storeCheckoutResult.ticketId,
      invoice: receiptInvoice,
    });

    onPay?.(buildOnPayPayload(storeCheckoutResult));
    onResetCart?.();
    notifySuccess(successKey);
  } catch (paymentCompletionError) {
    logPaymentError("Error completing payment", paymentCompletionError);
    notifyError(getCheckoutErrorDescription(paymentCompletionError, errorKey));
  } finally {
    finalize();
    dispatch({ type: "stop" });
  }
}

export function buildHandleBtcComplete({ getConfig, setConfig, ...context }) {
  return async function handleBtcComplete(completionData) {
    const config = getConfig();
    if (!config) return;

    const paymentHash = completionData?.invoice?.paymentHash ?? null;

    await runDeferredCheckout({
      ...context,
      checkoutArgs: {
        cartItems: config.cartItems,
        paymentAmounts: {
          amountFiat: config.amountFiat,
          subtotal: config.subtotal,
          discount: config.discount,
          discountAmount: config.discountAmount,
          tipAmount: config.tipAmount,
          tipAmountFiat: config.tipAmountFiat,
          total: config.total,
        },
        selectedPaymentMethod: config.selectedPaymentMethod,
        currencyId: config.currencyId,
        transactionId: completionData?.invoice?.serialized || "",
        satoshiAmount: completionData?.satoshis ?? null,
        exchangeRateAtPayment: config.invoiceData?.exchangeRate ?? null,
        paymentHash,
        exchangeRateCurrency: config.currencyAcronym ?? null,
        fiatAmountAtPayment: config.amountFiat ?? null,
      },
      receiptItems: config.cartItems,
      receiptTotal: config.total,
      receiptDiscountAmount: config.discountAmount,
      receiptTipAmount: config.tipAmount,
      receiptInvoice: completionData?.invoice?.serialized || "",
      buildOnPayPayload: (storeCheckoutResult) => ({
        items: config.cartItems,
        subtotal: config.subtotal,
        discount: config.discount,
        discountAmount: config.discountAmount,
        tipAmount: config.tipAmount,
        total: config.total,
        amount: config.amountFiat,
        paymentMethod: config.selectedPaymentMethod,
        ...storeCheckoutResult,
        ...completionData,
      }),
      successKey: "success.btcPaid",
      errorKey: "errors.btcComplete",
      pendingKey: "success.btcConfirming",
      onCheckoutSuccess: async (storeCheckoutResult) => {
        if (!paymentHash) return;
        await markCheckoutCompleted(paymentHash, storeCheckoutResult).catch(() => {});
        await deleteCheckout(paymentHash).catch(() => {});
      },
      finalize: () => setConfig((previousConfig) => (
        previousConfig ? { ...previousConfig, paymentCompleted: true } : previousConfig
      )),
    });
  };
}

export function buildHandleCashComplete({ getConfig, setConfig, ...context }) {
  return async function handleCashComplete(completionData) {
    const cashPaymentConfig = getConfig();
    if (!cashPaymentConfig) return;

    await runDeferredCheckout({
      ...context,
      checkoutArgs: {
        cartItems: cashPaymentConfig.cartItems || [],
        paymentAmounts: cashPaymentConfig.paymentAmounts,
        selectedPaymentMethod: cashPaymentConfig.selectedPaymentMethod,
        currencyId: cashPaymentConfig.currencyId,
      },
      receiptItems: cashPaymentConfig.cartItems,
      receiptTotal: cashPaymentConfig.paymentAmounts.total,
      receiptDiscountAmount: cashPaymentConfig.paymentAmounts.discountAmount,
      receiptTipAmount: cashPaymentConfig.paymentAmounts.tipAmount,
      buildOnPayPayload: (storeCheckoutResult) => ({
        items: cashPaymentConfig.cartItems,
        ...cashPaymentConfig.paymentAmounts,
        paymentMethod: cashPaymentConfig.selectedPaymentMethod,
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
    const cardPaymentConfig = getConfig();
    if (!cardPaymentConfig) return;

    await runDeferredCheckout({
      ...context,
      checkoutArgs: {
        cartItems: cardPaymentConfig.cartItems || [],
        paymentAmounts: cardPaymentConfig.paymentAmounts,
        selectedPaymentMethod: cardPaymentConfig.selectedPaymentMethod,
        currencyId: cardPaymentConfig.currencyId,
      },
      receiptItems: cardPaymentConfig.cartItems,
      receiptTotal: cardPaymentConfig.paymentAmounts.total,
      receiptDiscountAmount: cardPaymentConfig.paymentAmounts.discountAmount,
      receiptTipAmount: cardPaymentConfig.paymentAmounts.tipAmount,
      buildOnPayPayload: (storeCheckoutResult) => ({
        items: cardPaymentConfig.cartItems,
        ...cardPaymentConfig.paymentAmounts,
        paymentMethod: cardPaymentConfig.selectedPaymentMethod,
        ...storeCheckoutResult,
        methodLabel: cardPaymentConfig.methodLabel,
      }),
      successKey: "success.cardPaid",
      errorKey: "errors.cardComplete",
      finalize: () => setConfig(null),
    });
  };
}

export function buildHandleTransferComplete({ getConfig, setConfig, ...context }) {
  return async function handleTransferComplete(completionData) {
    const transferPaymentConfig = getConfig();
    if (!transferPaymentConfig) return;

    await runDeferredCheckout({
      ...context,
      checkoutArgs: {
        cartItems: transferPaymentConfig.cartItems || [],
        paymentAmounts: transferPaymentConfig.paymentAmounts,
        selectedPaymentMethod: transferPaymentConfig.selectedPaymentMethod,
        currencyId: transferPaymentConfig.currencyId,
        transactionId: completionData?.reference || "",
      },
      receiptItems: transferPaymentConfig.cartItems,
      receiptTotal: transferPaymentConfig.paymentAmounts.total,
      receiptDiscountAmount: transferPaymentConfig.paymentAmounts.discountAmount,
      receiptTipAmount: transferPaymentConfig.paymentAmounts.tipAmount,
      buildOnPayPayload: (storeCheckoutResult) => ({
        items: transferPaymentConfig.cartItems,
        ...transferPaymentConfig.paymentAmounts,
        paymentMethod: transferPaymentConfig.selectedPaymentMethod,
        ...storeCheckoutResult,
        methodLabel: transferPaymentConfig.methodLabel,
        reference: completionData?.reference,
      }),
      successKey: "success.transferPaid",
      errorKey: "errors.transferComplete",
      finalize: () => setConfig(null),
    });
  };
}
