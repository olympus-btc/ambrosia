"use client";
import { useMemo } from "react";

import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTurn } from "@/hooks/turn/useTurn";

import { usePaymentCurrency } from "../../hooks/usePaymentCurrency";
import { usePaymentMethods } from "../hooks/usePaymentMethod";
import {
  ensureCartReady,
  normalizeAmounts,
} from "../utils/paymentBuilders";

import {
  buildHandlePay,
  buildHandleCashComplete,
  buildHandleCardComplete,
} from "./paymentHandlers";
import { useBtcPayment } from "./useBtcPayment";
import { useCustomerReceipt } from "./useCustomerReceipt";
import { usePaymentChannel } from "./usePaymentChannel";
import { usePaymentState } from "./usePaymentState";

export function useCartPayment({ onPay, onResetCart } = {}) {
  const paymentTranslations = useTranslations("cart.payment");
  const { user } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const { refreshShiftTickets } = useTurn();
  const { printCustomerReceipt } = useCustomerReceipt();
  const { paymentMethods, forbidden: paymentMethodsForbidden } = usePaymentMethods();
  const { getPaymentCurrencyById, forbidden: paymentCurrencyForbidden } = usePaymentCurrency();
  const paymentsForbidden = paymentMethodsForbidden || paymentCurrencyForbidden;

  const { isPaying, paymentError, dispatch, notifyError, notifySuccess, clearPaymentError } = usePaymentState(paymentTranslations);

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
      notifySuccess,
      user,
      printCustomerReceipt,
      refreshShiftTickets,
    }),
    [dispatch, onPay, onResetCart, notifyError, notifySuccess, user, printCustomerReceipt, refreshShiftTickets],
  );

  const btc = useBtcPayment(handlerContext);
  const cash = usePaymentChannel(buildHandleCashComplete, handlerContext);
  const card = usePaymentChannel(buildHandleCardComplete, handlerContext);

  const handlePay = useMemo(
    () => buildHandlePay({
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
      notifySuccess,
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
      notifySuccess,
      dispatch,
      onPay,
      onResetCart,
      paymentMethodMap,
      user,
      printCustomerReceipt,
      refreshShiftTickets,
      btc.setConfig,
      cash.setConfig,
      card.setConfig,
    ],
  );

  const btcPayment = useMemo(
    () => ({ config: btc.config, onInvoiceReady: btc.onInvoiceReady, onComplete: btc.onComplete, onClose: btc.onClose }),
    [btc.config, btc.onInvoiceReady, btc.onComplete, btc.onClose],
  );

  const cashPayment = useMemo(
    () => ({ config: cash.config, onComplete: cash.onComplete, onClose: cash.onClose }),
    [cash.config, cash.onComplete, cash.onClose],
  );

  const cardPayment = useMemo(
    () => ({ config: card.config, onComplete: card.onComplete, onClose: card.onClose }),
    [card.config, card.onComplete, card.onClose],
  );

  return {
    handlePay,
    isPaying,
    paymentError,
    clearPaymentError,
    paymentsForbidden,
    btcPayment,
    cashPayment,
    cardPayment,
  };
}
