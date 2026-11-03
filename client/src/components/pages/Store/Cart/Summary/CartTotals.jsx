import { useState } from "react";

import { Divider } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { usePermission } from "@/hooks/usePermission";

import { getDiscountedSubtotal, parseTipPercentages, resolveTipAmount } from "../utils/tipCalculations";

import { DiscountInput } from "./DiscountInput";
import { TipSelector } from "./TipSelector";

export function CartTotals({
  subtotal,
  discountAmount,
  discount,
  discountType,
  onApplyDiscount,
  tip: selectedTipValue = 0,
  tipType: selectedTipType = "percentage",
  onApplyTip,
  tipsEnabled = false,
  tipPercentages,
  customTipDefaultType,
}) {
  const translateCart = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const canApplyDiscount = usePermission({ allOf: ["orders_discount"] });

  const [previewDiscountValue, setPreviewDiscountValue] = useState(null);
  const [previewDiscountType, setPreviewDiscountType] = useState("percentage");

  const [previewTipValue, setPreviewTipValue] = useState(null);
  const [previewTipType, setPreviewTipType] = useState("percentage");

  const configuredTipPercentages = parseTipPercentages(tipPercentages);

  function handleDiscountPreview(value, type) {
    setPreviewDiscountValue(value);
    if (type !== undefined) setPreviewDiscountType(type);
  }

  function handleTipPreview(value, type) {
    setPreviewTipValue(value);
    if (type !== undefined) setPreviewTipType(type);
  }

  function resolveDisplayDiscountAmount() {
    if (previewDiscountValue === null) return discountAmount;
    if (previewDiscountType === "fixed") return (Number(previewDiscountValue) || 0) * 100;
    return (subtotal * (Number(previewDiscountValue) || 0)) / 100;
  }

  const displayedDiscountAmount = resolveDisplayDiscountAmount();
  const discountedSubtotal = getDiscountedSubtotal(subtotal, displayedDiscountAmount);

  function resolveDisplayTipAmount() {
    if (!tipsEnabled) return 0;
    if (previewTipValue === null) {
      return resolveTipAmount(discountedSubtotal, selectedTipValue, selectedTipType);
    }
    return resolveTipAmount(discountedSubtotal, previewTipValue, previewTipType);
  }

  const displayedTipAmount = resolveDisplayTipAmount();
  const displayedTotal = discountedSubtotal + displayedTipAmount;

  return (
    <div className="space-y-2 text-sm text-gray-800">
      {(displayedDiscountAmount > 0 || displayedTipAmount > 0) && (
        <div className="flex justify-between">
          <span>{translateCart("summary.subtotal")}</span>
          <span>{formatAmount(subtotal)}</span>
        </div>
      )}

      {canApplyDiscount ? (
        <DiscountInput
          discount={discount}
          discountType={discountType}
          onApply={onApplyDiscount}
          onPreview={handleDiscountPreview}
        />
      ) : discount > 0 ? (
        <div className="flex justify-between">
          <span>{translateCart("summary.discount")}</span>
          <span>{discountType === "fixed" ? formatAmount(discount * 100) : `${discount}%`}</span>
        </div>
      ) : null}

      {tipsEnabled && (
        <>
          <Divider className="bg-gray-100" />
          <TipSelector
            tip={selectedTipValue}
            tipType={selectedTipType}
            onApply={onApplyTip}
            onPreview={handleTipPreview}
            suggestedPercentages={configuredTipPercentages}
            defaultCustomTipType={customTipDefaultType}
            formattedTipAmount={displayedTipAmount > 0 ? `+${formatAmount(displayedTipAmount)}` : undefined}
          />
        </>
      )}

      <Divider className="bg-green-600" />
      <div className="flex justify-between items-center font-semibold text-green-900">
        <span>{translateCart("summary.total")}:</span>
        <span className="text-lg">{formatAmount(displayedTotal)}</span>
      </div>
    </div>
  );
}
