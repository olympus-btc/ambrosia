"use client";

import { useEffect, useState } from "react";

import BitcoinPriceService from "@/services/bitcoinPriceService";

const bitcoinService = new BitcoinPriceService();

export function useSatsToFiatEstimate({
  isActive,
  isPaid,
  satsAmount,
  currencyAcronym,
}) {
  const [estimatedFiatResult, setEstimatedFiatResult] = useState(null);

  useEffect(() => {
    if (!isActive || isPaid || !satsAmount || satsAmount <= 0) return;

    let cancelled = false;

    bitcoinService
      .satoshisToFiat(satsAmount, currencyAcronym)
      .then((fiat) => {
        if (!cancelled) {
          setEstimatedFiatResult({ value: fiat, error: false, forValue: satsAmount });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEstimatedFiatResult({ value: null, error: true, forValue: satsAmount });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isActive, isPaid, satsAmount, currencyAcronym]);

  const estimatedFiat = estimatedFiatResult?.forValue === satsAmount ? estimatedFiatResult.value : null;
  const estimatedFiatIsLoading = satsAmount > 0 &&
    estimatedFiat == null &&
    !(estimatedFiatResult?.error && estimatedFiatResult?.forValue === satsAmount);
  const estimatedFiatHasError = estimatedFiatResult?.error && estimatedFiatResult?.forValue === satsAmount;

  return {
    estimatedFiat,
    estimatedFiatHasError,
    estimatedFiatIsLoading,
  };
}
