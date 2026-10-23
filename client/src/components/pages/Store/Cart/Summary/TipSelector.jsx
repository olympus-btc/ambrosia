"use client";

import { useState } from "react";

import { Button, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { toNumberInputValue } from "@/components/utils/numberParsers";

import { DEFAULT_CUSTOM_TIP_TYPE, DEFAULT_TIP_PERCENTAGES } from "../utils/tipCalculations";

export function TipSelector({
  tip: selectedTipValue = 0,
  tipType: selectedTipType = "percentage",
  onApply,
  onPreview,
  suggestedPercentages = DEFAULT_TIP_PERCENTAGES,
  defaultCustomTipType = DEFAULT_CUSTOM_TIP_TYPE,
  formattedTipAmount,
}) {
  const translateCart = useTranslations("cart");
  const [isCustomEditorOpen, setIsCustomEditorOpen] = useState(false);
  const [customTipValue, setCustomTipValue] = useState(0);
  const [customTipType, setCustomTipType] = useState(defaultCustomTipType);

  const availablePercentages = Array.isArray(suggestedPercentages) && suggestedPercentages.length > 0
    ? suggestedPercentages
    : DEFAULT_TIP_PERCENTAGES;

  function handleSelectPreset(percentage) {
    setIsCustomEditorOpen(false);
    setCustomTipValue(0);
    onPreview?.(null);
    onApply?.(percentage, "percentage");
  }

  function handleOpenCustom() {
    setIsCustomEditorOpen(true);
    const hasAppliedTip = selectedTipValue > 0;
    setCustomTipValue(hasAppliedTip ? selectedTipValue : 0);
    setCustomTipType(hasAppliedTip ? selectedTipType : defaultCustomTipType);
  }

  function handleCustomTypeToggle(selectedType) {
    setCustomTipType(selectedType);
    setCustomTipValue(0);
    onPreview?.(0, selectedType);
  }

  function handleCustomApply() {
    if (customTipValue < 0) return;
    if (customTipType === "percentage" && customTipValue > 100) return;
    onApply?.(customTipValue, customTipType);
    onPreview?.(null);
    setIsCustomEditorOpen(false);
  }

  const isPresetSelected = (percentage) => (
    !isCustomEditorOpen && selectedTipType === "percentage" && selectedTipValue === percentage
  );
  const isNoTipSelected = !isCustomEditorOpen && selectedTipValue === 0;
  const isCustomTipSelected = isCustomEditorOpen || (
    selectedTipValue > 0
    && (selectedTipType === "fixed" || !availablePercentages.includes(selectedTipValue))
  );

  return (
    <div className="space-y-2 pt-1" data-testid="tip-selector">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-800">
          {translateCart("summary.tip")}
        </span>
        {formattedTipAmount && (
          <span className="text-gray-500">
            {formattedTipAmount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <Button
          size="sm"
          variant={isNoTipSelected ? "solid" : "flat"}
          color={isNoTipSelected ? "primary" : "default"}
          className="text-xs min-w-12 h-8 px-2.5"
          onPress={() => handleSelectPreset(0)}
        >
          {translateCart("summary.noTip")}
        </Button>

        {availablePercentages.map((percentage) => (
          <Button
            key={percentage}
            size="sm"
            variant={isPresetSelected(percentage) ? "solid" : "flat"}
            color={isPresetSelected(percentage) ? "primary" : "default"}
            className="text-xs min-w-12 h-8 px-2.5"
            onPress={() => handleSelectPreset(percentage)}
          >
            {percentage}%
          </Button>
        ))}

        <Button
          size="sm"
          variant={isCustomTipSelected ? "solid" : "flat"}
          color={isCustomTipSelected ? "primary" : "default"}
          className="text-xs min-w-12 h-8 px-2.5"
          onPress={handleOpenCustom}
        >
          {translateCart("summary.customTip")}
        </Button>
      </div>

      {isCustomEditorOpen && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={customTipType === "percentage" ? "solid" : "flat"}
              color={customTipType === "percentage" ? "primary" : "default"}
              className="h-7 px-2 text-xs"
              onPress={() => handleCustomTypeToggle("percentage")}
            >
              %
            </Button>
            <Button
              size="sm"
              variant={customTipType === "fixed" ? "solid" : "flat"}
              color={customTipType === "fixed" ? "primary" : "default"}
              className="h-7 px-2 text-xs"
              onPress={() => handleCustomTypeToggle("fixed")}
            >
              $
            </Button>
          </div>
          <div className="flex items-stretch gap-2">
            <NumberInput
              hideStepper
              minValue={0}
              maxValue={customTipType === "percentage" ? 100 : undefined}
              size="sm"
              value={customTipValue}
              classNames={{ inputWrapper: "shadow-none" }}
              onValueChange={(value) => {
                const numericValue = value ?? 0;
                setCustomTipValue(numericValue);
                onPreview?.(numericValue, customTipType);
              }}
              onChange={(event) => {
                const numericValue = toNumberInputValue(event);
                setCustomTipValue(numericValue);
                onPreview?.(numericValue, customTipType);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCustomApply();
                if (event.key === "Escape") {
                  setIsCustomEditorOpen(false);
                  onPreview?.(null);
                }
              }}
              autoFocus
            />
            <Button color="primary" size="sm" className="h-auto!" onPress={handleCustomApply}>
              {translateCart("summary.tipApply")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
