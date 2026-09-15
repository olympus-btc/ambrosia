"use client";
import { useCallback, useEffect, useState } from "react";

import BitcoinPriceService from "@/services/bitcoinPriceService";
import { createInvoiceForCart, isSecretsLockedError } from "@/services/walletService";

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
  const [isSecretsLocked, setIsSecretsLocked] = useState(false);

  const reset = useCallback(() => {
    setInvoice(null);
    setSatsAmount(null);
    setIsSecretsLocked(false);
  }, []);

  const generateInvoice = useCallback(async () => {
    if (!amountFiat) return null;

    setLoading(true);
    setIsSecretsLocked(false);

    try {
      const btcPrice = await priceService.getBitcoinPrice(currencyAcronym.toLowerCase());
      const sats = Math.round((amountFiat / btcPrice) * 100_000_000);
      const fallbackDescription = paymentId || `btc-${Date.now()}`;
      const createdInvoice = await createInvoiceForCart(
        sats,
        invoiceDescription || fallbackDescription,
      );

      setInvoice(createdInvoice);
      setSatsAmount(sats);
      onInvoiceReady?.({ invoice: createdInvoice, satoshis: sats, paymentId, exchangeRate: btcPrice });

      return createdInvoice;
    } catch (caughtError) {
      console.error("Error generating BTC invoice:", caughtError);
      setIsSecretsLocked(isSecretsLockedError(caughtError));
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
    isSecretsLocked,
    generateInvoice,
    reset,
  };
}
