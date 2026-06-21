"use client";

import { useState } from "react";

import { useCurrency } from "@/components/hooks/useCurrency";
import { decodeInvoice, payInvoiceFromService } from "@/services/walletService";

import { getBolt11ValidationError } from "../utils/validateBolt11Invoice";

export function useSendPaymentFlow({
  fetchInfo,
  fetchTransactions,
  currentRate,
  validateInvoice,
}) {
  const { currency } = useCurrency();
  const [payInvoice, setPayInvoice] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [invoiceValidationError, setInvoiceValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [decodedInvoice, setDecodedInvoice] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const updateInvoice = (value) => {
    setPayInvoice(value);
    setInvoiceValidationError("");
  };

  const openConfirm = async () => {
    const validationError = validateInvoice
      ? validateInvoice(payInvoice)
      : getBolt11ValidationError(payInvoice, (key) => key);

    if (validationError) {
      setInvoiceValidationError(validationError);
      return { status: "validation_error", error: validationError };
    }

    try {
      setIsLoading(true);
      const decoded = await decodeInvoice(payInvoice);
      setDecodedInvoice(decoded);
      setPaymentResult(null);
      setIsConfirmOpen(true);
      return { status: "ready", decodedInvoice: decoded };
    } catch {
      return { status: "decode_error" };
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPayment = async (customAmountSat) => {
    try {
      setIsLoading(true);
      const paymentResponse = await payInvoiceFromService(payInvoice, customAmountSat, {
        exchangeRate: currentRate ?? null,
        exchangeRateCurrency: currentRate != null ? (currency?.acronym?.toLowerCase() ?? null) : null,
      });
      setPaymentResult(paymentResponse);
      setPayInvoice("");
      setInvoiceValidationError("");
      fetchInfo?.();
      fetchTransactions?.();
      return { status: "success", paymentResult: paymentResponse };
    } catch (paymentError) {
      if (paymentError?.code) {
        console.warn(paymentError);
      } else {
        console.error(paymentError);
      }
      return { status: "payment_error", error: paymentError };
    } finally {
      setIsLoading(false);
    }
  };

  const closeConfirm = () => {
    setIsConfirmOpen(false);
    setDecodedInvoice(null);
    setPaymentResult(null);
  };

  return {
    decodedInvoice,
    invoiceValidationError,
    isConfirmOpen,
    isLoading,
    payInvoice,
    paymentResult,
    actions: {
      closeConfirm,
      confirmPayment,
      openConfirm,
      updateInvoice,
    },
  };
}
