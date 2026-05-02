"use client";

import { useCallback, useEffect, useState } from "react";

import BitcoinPriceService from "@/services/bitcoinPriceService";

import { useSatsToFiatEstimate } from "./useSatsToFiatEstimate";

const bitcoinService = new BitcoinPriceService();
const DEFAULT_AMOUNT_MODE = "sat";

function resolveEffectiveAmount({
  isZeroAmount,
  amountInputMode,
  parsedSatAmount,
  invoiceSats,
  estimatedSatsResult,
  customEstimateFiat,
}) {
  if (!isZeroAmount) return invoiceSats;
  if (amountInputMode !== "fiat") return parsedSatAmount;
  if (estimatedSatsResult?.forValue !== customEstimateFiat) return null;
  return estimatedSatsResult.value;
}

export function usePaymentAmountInput({
  isOpen,
  isPaid,
  invoiceSats,
  currencyAcronym,
  t,
}) {
  const [customEstimateSat, setCustomEstimateSat] = useState("");
  const [customEstimateFiat, setCustomEstimateFiat] = useState("");
  const [customEstimateError, setCustomEstimateError] = useState("");
  const [amountInputMode, setAmountInputMode] = useState(DEFAULT_AMOUNT_MODE);
  const [estimatedSatsResult, setEstimatedSatsResult] = useState(null);

  const isZeroAmount = invoiceSats == null;
  const parsedSatAmount = parseInt(customEstimateSat, 10);
  const parsedFiatAmount = parseFloat(customEstimateFiat);
  const estimatedSats = resolveEffectiveAmount({
    isZeroAmount,
    amountInputMode,
    parsedSatAmount,
    invoiceSats,
    estimatedSatsResult,
    customEstimateFiat,
  });
  const isValidSatAmount = Number.isInteger(parsedSatAmount) && parsedSatAmount > 0;
  const isValidFiatAmount = Number.isFinite(parsedFiatAmount) && parsedFiatAmount > 0;

  useEffect(() => {
    if (!isOpen || isPaid || !isZeroAmount || amountInputMode !== "fiat") return;
    if (!customEstimateFiat.trim() || !isValidFiatAmount) return;

    let cancelled = false;

    bitcoinService
      .fiatToSatoshis(parsedFiatAmount, currencyAcronym)
      .then((sats) => {
        if (!cancelled) {
          setEstimatedSatsResult({ value: sats, error: false, forValue: customEstimateFiat });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEstimatedSatsResult({ value: null, error: true, forValue: customEstimateFiat });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    amountInputMode,
    currencyAcronym,
    customEstimateFiat,
    isOpen,
    isPaid,
    isValidFiatAmount,
    isZeroAmount,
    parsedFiatAmount,
  ]);

  const {
    estimatedFiat: estimatedFiatValue,
    estimatedFiatHasError,
    estimatedFiatIsLoading,
  } = useSatsToFiatEstimate({
    isActive: isOpen,
    isPaid,
    satsAmount: estimatedSats,
    currencyAcronym,
  });
  const fiatToSatIsLoading = amountInputMode === "fiat" &&
    customEstimateFiat.trim() &&
    isValidFiatAmount &&
    (estimatedSatsResult?.forValue !== customEstimateFiat || estimatedSatsResult?.value == null) &&
    !(estimatedSatsResult?.error && estimatedSatsResult?.forValue === customEstimateFiat);
  const fiatToSatHasError = amountInputMode === "fiat" &&
    estimatedSatsResult?.error &&
    estimatedSatsResult?.forValue === customEstimateFiat;

  const handleAmountModeChange = useCallback((nextMode) => {
    setAmountInputMode(nextMode);
    setCustomEstimateError("");
  }, []);

  const handleAmountChange = useCallback((value) => {
    const normalizedValue = value == null ? "" : String(value);

    if (amountInputMode === "fiat") {
      setCustomEstimateFiat(normalizedValue);
    } else {
      setCustomEstimateSat(normalizedValue);
    }
    setCustomEstimateError("");
  }, [amountInputMode]);

  const getConfirmAmount = useCallback(() => {
    if (!isZeroAmount) return null;

    if (amountInputMode === "fiat") {
      if (!isValidFiatAmount || !estimatedSats || estimatedSats <= 0) {
        setCustomEstimateError(t("payments.send.confirmModal.zeroAmountError"));
        return undefined;
      }
      return estimatedSats;
    }

    if (!isValidSatAmount) {
      setCustomEstimateError(t("payments.send.confirmModal.zeroAmountError"));
      return undefined;
    }

    return parsedSatAmount;
  }, [
    amountInputMode,
    estimatedSats,
    isValidFiatAmount,
    isValidSatAmount,
    isZeroAmount,
    parsedSatAmount,
    t,
  ]);

  return {
    amountInputMode,
    customEstimateError,
    customEstimateValue: amountInputMode === "fiat" ? customEstimateFiat : customEstimateSat,
    estimatedFiat: estimatedFiatValue,
    estimatedFiatHasError,
    estimatedFiatIsLoading,
    estimatedSats,
    fiatToSatHasError,
    fiatToSatIsLoading,
    handleAmountChange,
    handleAmountModeChange,
    getConfirmAmount,
    isConfirmDisabled: isZeroAmount && (
      amountInputMode === "fiat"
        ? !isValidFiatAmount || fiatToSatIsLoading || !estimatedSats
        : !isValidSatAmount
    ),
  };
}
