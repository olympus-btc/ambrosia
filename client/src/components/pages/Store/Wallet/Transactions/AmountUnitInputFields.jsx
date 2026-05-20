"use client";

import { Button, NumberInput } from "@heroui/react";

import { useCurrency } from "@/components/hooks/useCurrency";

import { formatFiat, formatSats } from "../utils/formatters";

export function AmountUnitInputFields({
  labels,
  amountState,
  conversionState,
  errorMessage,
  isDisabled = false,
}) {
  const { currency } = useCurrency();
  const { amountInputMode, inputValue, onAmountChange, onAmountModeChange } = amountState;
  const {
    estimatedFiat, estimatedFiatHasError, estimatedFiatIsLoading,
    estimatedSats, fiatToSatHasError, fiatToSatIsLoading,
  } = conversionState;
  const {
    title, satLabel, satsOptionLabel, satPlaceholder,
    fiatLabel, fiatOptionLabel, fiatPlaceholder,
    estimatedLabel, loadingText, estimatedFiatErrorText, conversionErrorText,
  } = labels;

  const estimatedValue = amountInputMode === "fiat"
    ? `${formatSats(estimatedSats ?? 0)} sats`
    : formatFiat({
      value: estimatedFiat ?? 0,
      currencyAcronym: currency.acronym,
      locale: currency.locale,
    });

  const estimatedStateText = amountInputMode === "fiat"
    ? (fiatToSatIsLoading
        ? loadingText
        : fiatToSatHasError
          ? conversionErrorText
          : estimatedValue)
    : (estimatedFiatIsLoading
        ? loadingText
        : estimatedFiatHasError
          ? estimatedFiatErrorText
          : estimatedValue);

  const estimatedStateColor = (
    (amountInputMode === "fiat" && !fiatToSatIsLoading && !fiatToSatHasError) ||
    (amountInputMode !== "fiat" && !estimatedFiatIsLoading && !estimatedFiatHasError)
  )
    ? "text-forest"
    : "text-default-700";

  return (
    <div className="space-y-4">
      <div className="space-y-3 text-center">
        {title && (
          <p className="text-sm font-medium text-default-700">
            {title}
          </p>
        )}
        <div className="flex justify-center gap-2">
          <Button
            variant={amountInputMode === "sat" ? "solid" : "bordered"}
            color={amountInputMode === "sat" ? "primary" : "default"}
            onPress={() => onAmountModeChange("sat")}
            isDisabled={isDisabled}
            size="sm"
            className={`min-w-24 rounded-xl font-medium ${amountInputMode !== "sat" ? "border border-border bg-white text-foreground hover:bg-muted" : ""}`}
          >
            {satsOptionLabel}
          </Button>
          <Button
            variant={amountInputMode === "fiat" ? "solid" : "bordered"}
            color={amountInputMode === "fiat" ? "primary" : "default"}
            onPress={() => onAmountModeChange("fiat")}
            isDisabled={isDisabled}
            size="sm"
            className={`min-w-24 rounded-xl font-medium ${amountInputMode !== "fiat" ? "border border-border bg-white text-foreground hover:bg-muted" : ""}`}
          >
            {fiatOptionLabel}
          </Button>
        </div>
      </div>

      <NumberInput
        type="number"
        label={amountInputMode === "fiat" ? fiatLabel : satLabel}
        placeholder={amountInputMode === "fiat" ? fiatPlaceholder : satPlaceholder}
        value={inputValue === "" ? null : Number(inputValue)}
        onValueChange={onAmountChange}
        onChange={(event) => onAmountChange(event.target.value)}
        minValue={0}
        maxValue={amountInputMode === "fiat" ? Number.MAX_SAFE_INTEGER / 100 : Number.MAX_SAFE_INTEGER}
        formatOptions={{
          useGrouping: false,
          maximumFractionDigits: amountInputMode === "fiat" ? 2 : 0,
        }}
        isInvalid={Boolean(errorMessage) || fiatToSatHasError}
        errorMessage={errorMessage || (fiatToSatHasError ? conversionErrorText : "")}
        step={amountInputMode === "fiat" ? "0.01" : "1"}
        isDisabled={isDisabled}
        classNames={{
          inputWrapper: "border border-default-200 bg-white shadow-none",
        }}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm text-default-500">
          {estimatedLabel}
        </span>
        <span className={`font-medium ${estimatedStateColor}`}>
          {estimatedStateText}
        </span>
      </div>
    </div>
  );
}
