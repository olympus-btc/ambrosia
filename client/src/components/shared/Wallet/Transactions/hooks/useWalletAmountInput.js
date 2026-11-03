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

function resolveInvalidAmountMessage({ invalidAmountMessage, t }) {
  if (invalidAmountMessage) return invalidAmountMessage;
  if (t) return t("payments.send.confirmModal.zeroAmountError");
  return "";
}

function parseSatAmount(value) {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return {
      parsedValue: Number.NaN,
      isValid: false,
      isTooLarge: false,
    };
  }

  const parsedValue = Number(normalizedValue);
  return {
    parsedValue,
    isValid: Number.isSafeInteger(parsedValue) && parsedValue > 0,
    isTooLarge: !Number.isSafeInteger(parsedValue),
  };
}

export function useWalletAmountInput({
  isOpen,
  isPaid,
  invoiceSats,
  currencyAcronym,
  t,
  invalidAmountMessage,
  amountTooLargeMessage,
}) {
  const [customEstimateSat, setCustomEstimateSat] = useState("");
  const [customEstimateFiat, setCustomEstimateFiat] = useState("");
  const [customEstimateError, setCustomEstimateError] = useState("");
  const [amountInputMode, setAmountInputMode] = useState(DEFAULT_AMOUNT_MODE);
  const [estimatedSatsResult, setEstimatedSatsResult] = useState(null);

  const isZeroAmount = invoiceSats == null;
  const {
    parsedValue: parsedSatAmount,
    isValid: isValidSatAmount,
    isTooLarge: isSatAmountTooLarge,
  } = parseSatAmount(customEstimateSat);
  const parsedFiatAmount = Number.parseFloat(customEstimateFiat);
  const estimatedSats = resolveEffectiveAmount({
    isZeroAmount,
    amountInputMode,
    parsedSatAmount,
    invoiceSats,
    estimatedSatsResult,
    customEstimateFiat,
  });
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

  const resetAmounts = useCallback(() => {
    setCustomEstimateSat("");
    setCustomEstimateFiat("");
    setCustomEstimateError("");
    setAmountInputMode(DEFAULT_AMOUNT_MODE);
    setEstimatedSatsResult(null);
  }, []);

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
    const fallbackInvalidAmountMessage = resolveInvalidAmountMessage({ invalidAmountMessage, t });

    if (!isZeroAmount) return null;

    if (amountInputMode === "fiat") {
      if (!isValidFiatAmount || !estimatedSats || estimatedSats <= 0) {
        setCustomEstimateError(fallbackInvalidAmountMessage);
        return undefined;
      }
      return estimatedSats;
    }

    if (isSatAmountTooLarge) {
      setCustomEstimateError(amountTooLargeMessage || fallbackInvalidAmountMessage);
      return undefined;
    }

    if (!isValidSatAmount) {
      setCustomEstimateError(fallbackInvalidAmountMessage);
      return undefined;
    }

    return parsedSatAmount;
  }, [
    amountInputMode,
    amountTooLargeMessage,
    estimatedSats,
    invalidAmountMessage,
    isSatAmountTooLarge,
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
    getConfirmAmount,
    handleAmountChange,
    handleAmountModeChange,
    isConfirmDisabled: isZeroAmount && (
      amountInputMode === "fiat"
        ? !isValidFiatAmount || fiatToSatIsLoading || !estimatedSats
        : !isValidSatAmount
    ),
    isSatAmountTooLarge,
    resetAmounts,
  };
}
