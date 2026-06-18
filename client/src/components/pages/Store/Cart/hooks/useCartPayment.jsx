"use client";
import { useMemo } from "react";

import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTurn } from "@/hooks/turn/useTurn";

import { usePayments } from "../../hooks/usePayments";
import { usePaymentMethods } from "../hooks/usePaymentMethod";
import {
  ensureCartReady,
  normalizeAmounts,
} from "../utils/paymentBuilders";

import {
  buildHandlePay,
  buildHandleBtcInvoiceReady,
  buildHandleBtcComplete,
  buildHandleCashComplete,
  buildHandleCardComplete,
} from "./paymentHandlers";
import { useCustomerReceipt } from "./useCustomerReceipt";
import { useDeferredPayment } from "./useDeferredPayment";
import { usePaymentState } from "./usePaymentState";

export function useCartPayment({ onPay, onResetCart } = {}) {
  const t = useTranslations("cart.payment");
  const { user } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const { refreshShiftTickets } = useTurn();
  const { printCustomerReceipt } = useCustomerReceipt();
  const { paymentMethods } = usePaymentMethods();
  const { getPaymentCurrencyById } = usePayments();

  const { isPaying, paymentError, dispatch, notifyError, clearPaymentError } = usePaymentState();

  const paymentMethodMap = useMemo(
    () => (paymentMethods || []).reduce((acc, method) => { acc[method.id] = method; return acc; }, {}),
    [paymentMethods],
  );

  const handlerContext = useMemo(
    () => ({
      dispatch,
      onPay,
      onResetCart,
      notifyError,
      t,
      user,
      printCustomerReceipt,
      refreshShiftTickets,
    }),
    [dispatch, onPay, onResetCart, notifyError, t, user, printCustomerReceipt, refreshShiftTickets],
  );

  const btc = useDeferredPayment(buildHandleBtcComplete, handlerContext);
  const cash = useDeferredPayment(buildHandleCashComplete, handlerContext);
  const card = useDeferredPayment(buildHandleCardComplete, handlerContext);

  const handlePay = useMemo(
    () => buildHandlePay({
      t,
      currency,
      formatAmount,
      paymentMethodMap,
      getPaymentCurrencyById,
      setBtcPaymentConfig: btc.setConfig,
      setCashPaymentConfig: cash.setConfig,
      setCardPaymentConfig: card.setConfig,
      onResetCart,
      onPay,
      notifyError,
      dispatch,
      user,
      ensureCartReady,
      normalizeAmounts,
      printCustomerReceipt,
      refreshShiftTickets,
    }),
    [
      currency,
      formatAmount,
      getPaymentCurrencyById,
      notifyError,
      dispatch,
      onPay,
      onResetCart,
      paymentMethodMap,
      t,
      user,
      printCustomerReceipt,
      refreshShiftTickets,
      btc.setConfig,
      cash.setConfig,
      card.setConfig,
    ],
  );

  const handleBtcInvoiceReady = useMemo(
    () => buildHandleBtcInvoiceReady({ setBtcPaymentConfig: btc.setConfig }),
    [btc.setConfig],
  );

  const btcPayment = useMemo(
    () => ({
      config: btc.config,
      onInvoiceReady: handleBtcInvoiceReady,
      onComplete: btc.handleComplete,
      onClose: btc.clearConfig,
    }),
    [btc.config, btc.handleComplete, btc.clearConfig, handleBtcInvoiceReady],
  );

  const cashPayment = useMemo(
    () => ({
      config: cash.config,
      onComplete: cash.handleComplete,
      onClose: cash.clearConfig,
    }),
    [cash.config, cash.handleComplete, cash.clearConfig],
  );

  const cardPayment = useMemo(
    () => ({
      config: card.config,
      onComplete: card.handleComplete,
      onClose: card.clearConfig,
    }),
    [card.config, card.handleComplete, card.clearConfig],
  );

  return {
    handlePay,
    isPaying,
    paymentError,
    clearPaymentError,
    btcPayment,
    cashPayment,
    cardPayment,
  };
}
