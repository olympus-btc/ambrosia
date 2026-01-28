import { addToast } from "@heroui/react";

import { createOrderAndTicket } from "./paymentFlows";

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
  t,
  currency,
  formatAmount,
  paymentMethodMap,
  getPaymentCurrencyById,
  setBtcPaymentConfig,
  setCashPaymentConfig,
  setCardPaymentConfig,
  processBasePayment,
  decrementProductStock = async () => {},
  updateOrder,
  onResetCart,
  onPay,
  notifyError,
  dispatch,
  user,
  ensureCartReady,
  normalizeAmounts,
  buildOrderPayload,
  buildTicketPayload,
  buildPaymentPayload,
  createOrder,
  createTicket,
  createPayment,
  linkPaymentToTicket,
  printCustomerReceipt,
}) {
  return async function handlePay({
    items = [],
    subtotal = 0,
    discount = 0,
    discountAmount = 0,
    total = 0,
    selectedPaymentMethod,
  }) {
    try {
      ensureCartReady({
        t,
        items,
        selectedPaymentMethod,
        userId: user?.user_id,
        currencyId: currency?.id,
      });
    } catch (err) {
      notifyError(err.message);
      return;
    }

    dispatch({ type: "start" });

    try {
      const currencyId = currency.id;

      const amounts = normalizeAmounts({
        subtotal,
        discount,
        discountAmount,
        total,
        formatAmount,
      });

      const paymentMethodData = paymentMethodMap[selectedPaymentMethod] || null;
      const methodName = (paymentMethodData?.name || "").toLowerCase();

      if (methodName.includes("btc")) {
        const currencyData = await getPaymentCurrencyById(currencyId);
        const currencyAcronym = (
          currencyData?.acronym ||
          currency?.acronym ||
          "MXN"
        ).toLowerCase();
        const invoiceDescription = buildInvoiceDescription(items);

        setBtcPaymentConfig({
          paymentId: `btc-${Date.now()}`,
          amountFiat: amounts.amountFiat,
          currencyAcronym,
          displayTotal: amounts.displayTotal,
          subtotal: amounts.subtotal,
          discount: amounts.discount,
          discountAmount: amounts.discountAmount,
          total: amounts.total,
          items,
          invoiceDescription,
          selectedPaymentMethod,
          currencyId,
        });
        return;
      }

      if (methodName.includes("cash") || methodName.includes("efectivo")) {
        setCashPaymentConfig({
          amountDue: amounts.amountFiat,
          displayTotal: amounts.displayTotal,
          items,
          amounts,
          selectedPaymentMethod,
          currencyId,
        });
        return;
      }

      if (
        methodName.includes("credit") ||
        methodName.includes("debit") ||
        methodName.includes("card")
      ) {
        setCardPaymentConfig({
          amountDue: amounts.amountFiat,
          displayTotal: amounts.displayTotal,
          items,
          amounts,
          selectedPaymentMethod,
          currencyId,
          methodLabel: paymentMethodData?.name || "",
        });
        return;
      }

      const { paymentResult, orderPayload, orderId } = await processBasePayment(
        {
          items,
          amounts,
          selectedPaymentMethod,
          currencyId,
          user,
          createOrder,
          createTicket,
          createPayment,
          linkPaymentToTicket,
          buildOrderPayload,
          buildTicketPayload,
          buildPaymentPayload,
          t,
        },
      );

      if (orderId) {
        await updateOrder(orderId, {
          ...orderPayload,
          id: orderId,
          status: "paid",
        });
      }

      try {
        await decrementProductStock(items);
      } catch (err) {
        console.error("Error updating stock:", err);
        notifyError(t("errors.stockUpdate"));
      }

      await printCustomerReceipt?.({
        items,
        totalCents: amounts.total,
        ticketId: paymentResult?.ticketId,
      });

      addToast({
        color: "success",
        description: t("success.paid"),
      });
      onResetCart?.();
      onPay?.(paymentResult);
    } catch (err) {
      console.error("Error processing payment:", err);
      notifyError(err?.message || t("errors.process"));
    } finally {
      dispatch({ type: "stop" });
    }
  };
}

export function buildHandleBtcInvoiceReady({ setBtcPaymentConfig }) {
  return (data) => {
    setBtcPaymentConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        invoiceData: data,
      };
    });
  };
}

export function buildHandleBtcComplete({
  btcPaymentConfig,
  dispatch,
  createOrderAndTicketFn = createOrderAndTicket,
  buildOrderPayload,
  buildTicketPayload,
  createOrder,
  createTicket,
  buildPaymentPayload,
  createPayment,
  linkPaymentToTicket,
  decrementProductStock = async () => {},
  onPay,
  onResetCart,
  notifyError,
  t,
  user,
  setBtcPaymentConfig,
  printCustomerReceipt,
}) {
  return async (data) => {
    if (!btcPaymentConfig) return;
    dispatch({ type: "start" });
    try {
      const { orderId, ticketId } = await createOrderAndTicketFn({
        totalAmount: btcPaymentConfig.amountFiat,
        user,
        buildOrderPayload,
        buildTicketPayload,
        createOrder,
        createTicket,
        t,
      });

      const paymentPayload = buildPaymentPayload({
        methodId: btcPaymentConfig.selectedPaymentMethod,
        currencyId: btcPaymentConfig.currencyId,
        amount: btcPaymentConfig.amountFiat,
        transactionId: data?.invoice?.serialized || "",
      });

      const paymentResponse = await createPayment(paymentPayload);
      if (!paymentResponse?.id) {
        throw new Error(t("errors.createPayment"));
      }

      await linkPaymentToTicket(paymentResponse.id, ticketId);

      try {
        await decrementProductStock(btcPaymentConfig.items);
      } catch (err) {
        console.error("Error updating stock:", err);
        notifyError(t("errors.stockUpdate"));
      }

      await printCustomerReceipt?.({
        items: btcPaymentConfig.items,
        totalCents: btcPaymentConfig.total,
        ticketId,
        invoice: data?.invoice?.serialized || "",
      });

      onPay?.({
        items: btcPaymentConfig.items,
        subtotal: btcPaymentConfig.subtotal,
        discount: btcPaymentConfig.discount,
        discountAmount: btcPaymentConfig.discountAmount,
        total: btcPaymentConfig.total,
        amount: btcPaymentConfig.amountFiat,
        paymentMethod: btcPaymentConfig.selectedPaymentMethod,
        paymentId: paymentResponse?.id || null,
        orderId,
        ticketId: ticketId || null,
        ...data,
      });
      onResetCart?.();
      addToast({
        color: "success",
        description: t("success.btcPaid"),
      });
    } catch (err) {
      console.error("Error completing BTC payment:", err);
      notifyError(err?.message || t("errors.btcComplete"));
    } finally {
      setBtcPaymentConfig((prev) => {
        if (!prev) return prev;
        return { ...prev, paymentCompleted: true };
      });
      dispatch({ type: "stop" });
    }
  };
}

export function buildHandleCashComplete({
  cashPaymentConfig,
  dispatch,
  processBasePayment,
  buildOrderPayload,
  buildTicketPayload,
  createOrder,
  createTicket,
  buildPaymentPayload,
  createPayment,
  linkPaymentToTicket,
  updateOrder,
  decrementProductStock = async () => {},
  onPay,
  onResetCart,
  notifyError,
  t,
  setCashPaymentConfig,
  printCustomerReceipt,
  user,
}) {
  return async ({ cashReceived, change }) => {
    if (!cashPaymentConfig) return;
    dispatch({ type: "start" });
    try {
      const { paymentResult, orderPayload, orderId } = await processBasePayment(
        {
          items: cashPaymentConfig.items || [],
          amounts: cashPaymentConfig.amounts,
          selectedPaymentMethod: cashPaymentConfig.selectedPaymentMethod,
          currencyId: cashPaymentConfig.currencyId,
          user,
          buildOrderPayload,
          buildTicketPayload,
          createOrder,
          createTicket,
          buildPaymentPayload,
          createPayment,
          linkPaymentToTicket,
          t,
        },
      );

      if (orderId) {
        await updateOrder(orderId, {
          ...orderPayload,
          id: orderId,
          status: "paid",
        });
      }

      try {
        await decrementProductStock(paymentResult?.items || []);
      } catch (err) {
        console.error("Error updating stock:", err);
        notifyError(t("errors.stockUpdate"));
      }

      await printCustomerReceipt?.({
        items: paymentResult?.items,
        totalCents: paymentResult?.total,
        ticketId: paymentResult?.ticketId,
      });

      onPay?.({
        ...paymentResult,
        cashReceived,
        change,
      });
      onResetCart?.();
      addToast({
        color: "success",
        description: t("success.cashPaid"),
      });
    } catch (err) {
      console.error("Error completing cash payment:", err);
      notifyError(err?.message || t("errors.cashComplete"));
    } finally {
      setCashPaymentConfig(null);
      dispatch({ type: "stop" });
    }
  };
}

export function buildHandleCardComplete({
  cardPaymentConfig,
  dispatch,
  processBasePayment,
  buildOrderPayload,
  buildTicketPayload,
  createOrder,
  createTicket,
  buildPaymentPayload,
  createPayment,
  linkPaymentToTicket,
  updateOrder,
  decrementProductStock = async () => {},
  onPay,
  onResetCart,
  notifyError,
  t,
  setCardPaymentConfig,
  printCustomerReceipt,
  user,
}) {
  return async () => {
    if (!cardPaymentConfig) return;
    dispatch({ type: "start" });
    try {
      const { paymentResult, orderPayload, orderId } = await processBasePayment(
        {
          items: cardPaymentConfig.items || [],
          amounts: cardPaymentConfig.amounts,
          selectedPaymentMethod: cardPaymentConfig.selectedPaymentMethod,
          currencyId: cardPaymentConfig.currencyId,
          user,
          buildOrderPayload,
          buildTicketPayload,
          createOrder,
          createTicket,
          buildPaymentPayload,
          createPayment,
          linkPaymentToTicket,
          t,
        },
      );

      if (orderId) {
        await updateOrder(orderId, {
          ...orderPayload,
          id: orderId,
          status: "paid",
        });
      }

      try {
        await decrementProductStock(paymentResult?.items || []);
      } catch (err) {
        console.error("Error updating stock:", err);
        notifyError(t("errors.stockUpdate"));
      }

      await printCustomerReceipt?.({
        items: paymentResult?.items,
        totalCents: paymentResult?.total,
        ticketId: paymentResult?.ticketId,
      });

      onPay?.({
        ...paymentResult,
        methodLabel: cardPaymentConfig.methodLabel,
      });
      onResetCart?.();
      addToast({
        color: "success",
        description: t("success.cardPaid"),
      });
    } catch (err) {
      console.error("Error completing card payment:", err);
      notifyError(err?.message || t("errors.cardComplete"));
    } finally {
      setCardPaymentConfig(null);
      dispatch({ type: "stop" });
    }
  };
}
