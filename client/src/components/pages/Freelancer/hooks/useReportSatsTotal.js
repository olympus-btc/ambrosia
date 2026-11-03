"use client";

import { useEffect, useState } from "react";

import BitcoinPriceService from "@/services/bitcoinPriceService";

import { calculateReportTotalSatoshis } from "../Reports/utils/reportSatoshis";

const bitcoinPriceService = new BitcoinPriceService();
const getBitcoinPrice = (currency) => bitcoinPriceService.getBitcoinPrice(currency);

export function useReportSatsTotal(currencyGroups) {
  const [satsCalculation, setSatsCalculation] = useState({
    calculatedFor: null,
    totalSatoshis: null,
    unavailable: false,
  });
  const hasCurrencyGroups = Boolean(currencyGroups?.length);

  useEffect(() => {
    if (!currencyGroups?.length) return;

    let cancelled = false;

    calculateReportTotalSatoshis(currencyGroups, getBitcoinPrice)
      .then((calculatedTotalSatoshis) => {
        if (cancelled) return;
        setSatsCalculation({ calculatedFor: currencyGroups, totalSatoshis: calculatedTotalSatoshis, unavailable: false });
      })
      .catch(() => {
        if (cancelled) return;
        setSatsCalculation({ calculatedFor: currencyGroups, totalSatoshis: null, unavailable: true });
      });

    return () => { cancelled = true; };
  }, [currencyGroups]);

  if (!hasCurrencyGroups) return { totalSatoshis: null, loading: false, unavailable: false };

  const isCalculationCurrent = satsCalculation.calculatedFor === currencyGroups;

  return {
    totalSatoshis: isCalculationCurrent ? satsCalculation.totalSatoshis : null,
    loading: !isCalculationCurrent,
    unavailable: isCalculationCurrent && satsCalculation.unavailable,
  };
}
