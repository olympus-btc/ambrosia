"use client";

import { Button, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { formatSats } from "../../../utils/formatters";

export function ZeroAmountPaymentFields({
  amountInputMode,
  currencyAcronym,
  customEstimateError,
  customEstimateValue,
  estimatedSats,
  fiatToSatHasError,
  fiatToSatIsLoading,
  onAmountChange,
  onAmountModeChange,
}) {
  const t = useTranslations("wallet");

  return (
    <>
      <div className="space-y-2 text-center">
        <p className="text-sm text-gray-600">
          {t("payments.send.confirmModal.zeroAmountTitle")}
        </p>
        <div className="flex justify-center gap-2">
          <Button
            variant={amountInputMode === "sat" ? "solid" : "bordered"}
            color={amountInputMode === "sat" ? "primary" : "default"}
            onPress={() => onAmountModeChange("sat")}
          >
            {t("payments.send.confirmModal.satsOption")}
          </Button>
          <Button
            variant={amountInputMode === "fiat" ? "solid" : "bordered"}
            color={amountInputMode === "fiat" ? "primary" : "default"}
            onPress={() => onAmountModeChange("fiat")}
          >
            {t("payments.send.confirmModal.fiatOption", { currency: currencyAcronym })}
          </Button>
        </div>
      </div>

      <NumberInput
        type="number"
        label={amountInputMode === "fiat"
          ? t("payments.send.confirmModal.zeroAmountFiatLabel", { currency: currencyAcronym })
          : t("payments.send.confirmModal.zeroAmountLabel")}
        placeholder={amountInputMode === "fiat"
          ? t("payments.send.confirmModal.zeroAmountFiatPlaceholder")
          : t("payments.send.confirmModal.zeroAmountPlaceholder")}
        value={customEstimateValue === "" ? null : Number(customEstimateValue)}
        onValueChange={onAmountChange}
        onChange={(event) => onAmountChange(event.target.value)}
        minValue={0}
        maxValue={amountInputMode === "fiat" ? Number.MAX_SAFE_INTEGER / 100 : Number.MAX_SAFE_INTEGER}
        formatOptions={{
          useGrouping: false,
          maximumFractionDigits: amountInputMode === "fiat" ? 2 : 0,
        }}
        isInvalid={Boolean(customEstimateError) || fiatToSatHasError}
        errorMessage={customEstimateError || (fiatToSatHasError
          ? t("payments.send.confirmModal.fiatToSatsError")
          : "")}
        step={amountInputMode === "fiat" ? "0.01" : "1"}
      />

      {amountInputMode === "fiat" && (
        <div className="flex justify-between">
          <span className="text-gray-500">
            {t("payments.send.confirmModal.estimatedLabel")}
          </span>
          <span className="font-medium">
            {fiatToSatIsLoading && t("payments.send.confirmModal.fiatLoading")}
            {fiatToSatHasError && t("payments.send.confirmModal.fiatToSatsError")}
            {!fiatToSatIsLoading && !fiatToSatHasError && estimatedSats != null && `${formatSats(estimatedSats)} sats`}
          </span>
        </div>
      )}
    </>
  );
}
