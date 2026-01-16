"use client";
import { useCallback, useMemo, useReducer, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useAuth } from "@/modules/auth/useAuth";

import { useOrders } from "../../hooks/useOrders";
import { usePayments } from "../../hooks/usePayments";
import { usePrinters } from "../../hooks/usePrinter";
import { useTickets } from "../../hooks/useTickets";
import { usePaymentMethods } from "../hooks/usePaymentMethod";

import {
  ensureCartReady,
  buildOrderPayload,
  buildTicketPayload,
  buildPaymentPayload,
  normalizeAmounts,
} from "./paymentBuilders";
import { createOrderAndTicket, processBasePayment } from "./paymentFlows";
import {
  buildHandlePay,
  buildHandleBtcInvoiceReady,
  buildHandleBtcComplete,
  buildHandleCashComplete,
} from "./paymentHandlers";
import {
  initialPaymentState,
  paymentStateReducer,
  createErrorNotifier,
} from "./paymentState";

export function useCartPayment({ onPay, onResetCart } = {}) {
  const t = useTranslations("cart.payment");
  const { user } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const { printTicket, printerConfigs, loadingConfigs } = usePrinters();
  const { paymentMethods } = usePaymentMethods();
  const { createOrder, updateOrder } = useOrders();
  const { createPayment, linkPaymentToTicket, getPaymentCurrencyById } = usePayments();
  const { createTicket } = useTickets();

  const [{ isPaying, error: paymentError }, dispatch] = useReducer(
    paymentStateReducer,
    initialPaymentState,
  );
  const [btcPaymentConfig, setBtcPaymentConfig] = useState(null);
  const [cashPaymentConfig, setCashPaymentConfig] = useState(null);

  const clearPaymentError = useCallback(() => dispatch({ type: "clearError" }), []);

  const notifyError = useMemo(() => createErrorNotifier(dispatch), [dispatch]);

  const paymentMethodMap = useMemo(
    () => (paymentMethods || []).reduce((acc, method) => { acc[method.id] = method; return acc; }, {}), [paymentMethods]);

  const hasCustomerPrinter = useMemo(() => {
    if (!Array.isArray(printerConfigs)) return false;
    return printerConfigs.some(
      (config) =>
        config?.printerType === "CUSTOMER" && config?.enabled !== false,
    );
  }, [printerConfigs]);

  const printCustomerReceipt = useCallback(
    async ({ items, totalCents, ticketId, invoice }) => {
      if (loadingConfigs || !hasCustomerPrinter) return;
      const ticketData = {
        ticketId: ticketId?.toString() || "",
        tableName: t("receipt.tableName"),
        roomName: "",
        date: new Date().toISOString(),
        items: (items || []).map((item) => ({
          quantity: Number(item.quantity) || 1,
          name: item.name || "",
          price: Number(item.price) / 100,
          comments: [],
        })),
        total: Number(totalCents) / 100,
        invoice: invoice || null,
      };
      try {
        await printTicket({
          templateName: null,
          ticketData,
          printerType: "CUSTOMER",
          broadcast: false,
        });
      } catch (err) {
        console.error("Error printing customer ticket:", err);
        addToast({
          color: "warning",
          description: t("errors.printCustomer"),
        });
      }
    },
    [hasCustomerPrinter, loadingConfigs, printTicket, t],
  );

  const handlePay = useMemo(
    () => buildHandlePay({
      t,
      currency,
      formatAmount,
      paymentMethodMap,
      getPaymentCurrencyById,
      setBtcPaymentConfig,
      setCashPaymentConfig,
      processBasePayment,
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
    }),
    [
      currency,
      formatAmount,
      getPaymentCurrencyById,
      notifyError,
      onPay,
      onResetCart,
      paymentMethodMap,
      t,
      updateOrder,
      user,
      createOrder,
      createTicket,
      createPayment,
      linkPaymentToTicket,
      printCustomerReceipt,
    ],
  );

  const handleBtcInvoiceReady = useMemo(
    () => buildHandleBtcInvoiceReady({
      setBtcPaymentConfig,
    }),
    [],
  );

  const handleBtcComplete = useMemo(
    () => buildHandleBtcComplete({
      btcPaymentConfig,
      dispatch,
      createOrderAndTicket,
      buildOrderPayload,
      buildTicketPayload,
      createOrder,
      createTicket,
      buildPaymentPayload,
      createPayment,
      linkPaymentToTicket,
      onPay,
      onResetCart,
      notifyError,
      t,
      user,
      setBtcPaymentConfig,
      printCustomerReceipt,
    }),
    [
      btcPaymentConfig,
      dispatch,
      createOrder,
      createTicket,
      createPayment,
      linkPaymentToTicket,
      onPay,
      onResetCart,
      notifyError,
      t,
      user,
      printCustomerReceipt,
    ],
  );

  const clearBtcPaymentConfig = useCallback(() => {
    setBtcPaymentConfig(null);
  }, []);

  const handleCashComplete = useMemo(
    () => buildHandleCashComplete({
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
      onPay,
      onResetCart,
      notifyError,
      t,
      setCashPaymentConfig,
      printCustomerReceipt,
      user,
    }),
    [
      cashPaymentConfig,
      dispatch,
      notifyError,
      onPay,
      onResetCart,
      printCustomerReceipt,
      t,
      updateOrder,
      createOrder,
      createTicket,
      createPayment,
      linkPaymentToTicket,
      user,
    ],
  );

  const clearCashPaymentConfig = useCallback(() => {
    setCashPaymentConfig(null);
  }, []);

  return {
    handlePay,
    isPaying,
    paymentError,
    clearPaymentError,
    btcPaymentConfig,
    handleBtcInvoiceReady,
    handleBtcComplete,
    clearBtcPaymentConfig,
    cashPaymentConfig,
    handleCashComplete,
    clearCashPaymentConfig,
  };
}
