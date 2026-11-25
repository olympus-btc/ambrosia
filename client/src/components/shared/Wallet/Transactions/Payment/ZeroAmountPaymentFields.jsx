"use client";

import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

import { AmountUnitInputFields } from "../AmountUnitInputFields";

export function ZeroAmountPaymentFields({ amountState, isDisabled = false }) {
  const walletTranslations = useTranslations("wallet");
  const { currency } = useCurrency();
  const {
    amountInputMode, customEstimateError, customEstimateValue,
    estimatedFiat, estimatedFiatHasError, estimatedFiatIsLoading,
    estimatedSats, fiatToSatHasError, fiatToSatIsLoading,
    onAmountChange, onAmountModeChange,
  } = amountState;

  const fieldLabels = {
    title: walletTranslations("payments.send.confirmModal.zeroAmountTitle"),
    satLabel: walletTranslations("payments.send.confirmModal.zeroAmountLabel"),
    satsOptionLabel: walletTranslations("payments.send.confirmModal.satsOption"),
    satPlaceholder: walletTranslations("payments.send.confirmModal.zeroAmountPlaceholder"),
    fiatLabel: walletTranslations("payments.send.confirmModal.zeroAmountFiatLabel", { currency: currency.acronym }),
    fiatOptionLabel: walletTranslations("payments.send.confirmModal.fiatOption", { currency: currency.acronym }),
    fiatPlaceholder: walletTranslations("payments.send.confirmModal.zeroAmountFiatPlaceholder"),
    estimatedLabel: walletTranslations("payments.send.confirmModal.estimatedLabel"),
    loadingText: walletTranslations("payments.send.confirmModal.fiatLoading"),
    estimatedFiatErrorText: walletTranslations("payments.send.confirmModal.fiatError"),
    conversionErrorText: walletTranslations("payments.send.confirmModal.fiatToSatsError"),
  };

  return (
    <AmountUnitInputFields
      labels={fieldLabels}
      amountState={{ amountInputMode, inputValue: customEstimateValue, onAmountChange, onAmountModeChange }}
      conversionState={{ estimatedFiat, estimatedFiatHasError, estimatedFiatIsLoading, estimatedSats, fiatToSatHasError, fiatToSatIsLoading }}
      errorMessage={customEstimateError}
      isDisabled={isDisabled}
    />
  );
}
