"use client";

import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

import { AmountUnitInputFields } from "../AmountUnitInputFields";

export function ZeroAmountPaymentFields({ amountState, isDisabled = false }) {
  const t = useTranslations("wallet");
  const { currency } = useCurrency();
  const {
    amountInputMode, customEstimateError, customEstimateValue,
    estimatedFiat, estimatedFiatHasError, estimatedFiatIsLoading,
    estimatedSats, fiatToSatHasError, fiatToSatIsLoading,
    onAmountChange, onAmountModeChange,
  } = amountState;

  const fieldLabels = {
    title: t("payments.send.confirmModal.zeroAmountTitle"),
    satLabel: t("payments.send.confirmModal.zeroAmountLabel"),
    satsOptionLabel: t("payments.send.confirmModal.satsOption"),
    satPlaceholder: t("payments.send.confirmModal.zeroAmountPlaceholder"),
    fiatLabel: t("payments.send.confirmModal.zeroAmountFiatLabel", { currency: currency.acronym }),
    fiatOptionLabel: t("payments.send.confirmModal.fiatOption", { currency: currency.acronym }),
    fiatPlaceholder: t("payments.send.confirmModal.zeroAmountFiatPlaceholder"),
    estimatedLabel: t("payments.send.confirmModal.estimatedLabel"),
    loadingText: t("payments.send.confirmModal.fiatLoading"),
    estimatedFiatErrorText: t("payments.send.confirmModal.fiatError"),
    conversionErrorText: t("payments.send.confirmModal.fiatToSatsError"),
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
