"use client";

import { useCallback, useEffect, useState } from "react";

import BitcoinPriceService from "@/services/bitcoinPriceService";

const bitcoinService = new BitcoinPriceService();

export function useBitcoinPrice({ currencyAcronym } = {}) {
  const currency = currencyAcronym?.toLowerCase() ?? null;
  const [currentRate, setCurrentRate] = useState(null);
  const [fetchedFor, setFetchedFor] = useState(null);

  useEffect(() => {
    if (!currency) return;
    let cancelled = false;
    bitcoinService
      .getBitcoinPrice(currency)
      .then((rate) => {
        if (!cancelled) {
          setCurrentRate(rate);
          setFetchedFor(currency);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedFor(currency);
      });
    return () => { cancelled = true; };
  }, [currency]);

  const isLoading = Boolean(currency) && fetchedFor !== currency;

  const convertSatoshisToFiat = useCallback(
    (satoshis) => {
      if (!currentRate || satoshis == null) return null;
      return (satoshis / 100_000_000) * currentRate;
    },
    [currentRate],
  );

  return { currentRate, isLoading, convertSatoshisToFiat };
}
