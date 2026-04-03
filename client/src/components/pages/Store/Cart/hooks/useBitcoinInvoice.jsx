"use client";
import { useCallback, useEffect, useState } from "react";

import BitcoinPriceService from "@/services/bitcoinPriceService";
import { createInvoiceForCart } from "@/services/walletService";

const priceService = new BitcoinPriceService();

export function useBitcoinInvoice({
  amountFiat,
  currencyAcronym = "mxn",
  paymentId,
  invoiceDescription,
  autoGenerate = true,
  onInvoiceReady,
} = {}) {
  const [invoice, setInvoice] = useState(null);
  const [satsAmount, setSatsAmount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setInvoice(null);
    setSatsAmount(null);
    setError("");
  }, []);

  const generateInvoice = useCallback(async () => {
    if (!amountFiat) return null;

    setLoading(true);
    setError("");

    try {
      const sats = await priceService.fiatToSatoshis(
        amountFiat,
        currencyAcronym.toLowerCase(),
      );
      const fallbackDescription = paymentId || `btc-${Date.now()}`;
      const createdInvoice = await createInvoiceForCart(
        sats,
        invoiceDescription || fallbackDescription,
      );

      setInvoice(createdInvoice);
      setSatsAmount(sats);
      onInvoiceReady?.({ invoice: createdInvoice, satoshis: sats, paymentId });

      return createdInvoice;
    } catch (err) {
      const message = err?.message;
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [amountFiat, currencyAcronym, paymentId, invoiceDescription, onInvoiceReady]);

  useEffect(() => {
    if (!autoGenerate) {
      reset();
      return;
    }

    generateInvoice();
  }, [autoGenerate, generateInvoice, reset]);

  return {
    invoice,
    satsAmount,
    loading,
    error,
    generateInvoice,
    reset,
  };
}
