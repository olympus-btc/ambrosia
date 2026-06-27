"use client";

import { useState } from "react";

import { Button, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function DiscountInput({ discount, discountType, onApply, onPreview }) {
  const translateCart = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(0);
  const [activeType, setActiveType] = useState(discountType || "percentage");

  function handleApply() {
    if (inputValue < 0) return;
    if (activeType === "percentage" && inputValue > 100) return;
    onApply(inputValue, activeType);
    onPreview?.(null);
    setIsEditing(false);
    setInputValue(0);
  }

  function handleRemove() {
    onApply(0, discountType);
  }

  function handleStartEditing() {
    setActiveType(discountType || "percentage");
    setIsEditing(true);
  }

  function handleTypeToggle(type) {
    setActiveType(type);
    setInputValue(0);
    onPreview?.(0, type);
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={activeType === "percentage" ? "solid" : "flat"}
            color={activeType === "percentage" ? "primary" : "default"}
            onPress={() => handleTypeToggle("percentage")}
          >
            %
          </Button>
          <Button
            size="sm"
            variant={activeType === "fixed" ? "solid" : "flat"}
            color={activeType === "fixed" ? "primary" : "default"}
            onPress={() => handleTypeToggle("fixed")}
          >
            $
          </Button>
        </div>
        <div className="flex items-stretch gap-2">
          <NumberInput
            hideStepper
            minValue={0}
            maxValue={activeType === "percentage" ? 100 : undefined}
            size="sm"
            value={inputValue}
            classNames={{ inputWrapper: "shadow-none" }}
            onValueChange={(value) => {
              setInputValue(value);
              onPreview?.(value, activeType);
            }}
            onChange={(event) => {
              if (!event?.target) return;
              const numericValue = parseFloat(event.target.value.replace(/[^0-9.]/g, "")) || 0;
              setInputValue(numericValue);
              onPreview?.(numericValue, activeType);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleApply();
              if (event.key === "Escape") {
                setIsEditing(false);
                setInputValue(0);
                onPreview?.(null);
              }
            }}
            autoFocus
          />
          <Button color="primary" className="h-auto!" onPress={handleApply}>
            {translateCart("summary.discountApply")}
          </Button>
        </div>
      </div>
    );
  }

  const appliedDiscountLabel =
    discountType === "fixed" ? formatAmount(discount * 100) : `${discount}%`;

  return (
    <div className="flex justify-between items-center text-sm text-gray-800">
      <span>
        {translateCart("summary.discount")}
        {discount > 0 && `: ${appliedDiscountLabel}`}
      </span>
      {discount > 0 ? (
        <Button size="sm" color="danger" onPress={handleRemove}>
          {translateCart("summary.discountRemove")}
        </Button>
      ) : (
        <Button size="sm" color="primary" onPress={handleStartEditing}>
          {translateCart("summary.discountAdd")}
        </Button>
      )}
    </div>
  );
}
