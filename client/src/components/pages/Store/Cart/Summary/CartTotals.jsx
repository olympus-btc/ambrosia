import { useState } from "react";

import { Divider } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { usePermission } from "@/hooks/usePermission";

import { DiscountInput } from "./DiscountInput";

export function CartTotals({ subtotal, discountAmount, discount, discountType, onApplyDiscount }) {
  const translateCart = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const canApplyDiscount = usePermission({ allOf: ["orders_discount"] });
  const [previewDiscountValue, setPreviewDiscountValue] = useState(null);
  const [previewDiscountType, setPreviewDiscountType] = useState("percentage");

  function handlePreview(value, type) {
    setPreviewDiscountValue(value);
    if (type !== undefined) setPreviewDiscountType(type);
  }

  function resolveDisplayDiscountAmount() {
    if (previewDiscountValue === null) return discountAmount;
    if (previewDiscountType === "fixed") return (Number(previewDiscountValue) || 0) * 100;
    return (subtotal * (Number(previewDiscountValue) || 0)) / 100;
  }

  const displayDiscountAmount = resolveDisplayDiscountAmount();

  const displayTotal = subtotal - displayDiscountAmount;

  return (
    <div className="space-y-2 text-sm text-gray-800">
      {displayDiscountAmount > 0 && (
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
          onPreview={handlePreview}
        />
      ) : discount > 0 ? (
        <div className="flex justify-between">
          <span>{translateCart("summary.discount")}</span>
          <span>{discountType === "fixed" ? formatAmount(discount * 100) : `${discount}%`}</span>
        </div>
      ) : null}
      <Divider className="bg-green-600" />
      <div className="flex justify-between items-center font-semibold text-green-900">
        <span>{translateCart("summary.total")}:</span>
        <span className="text-lg">{formatAmount(displayTotal)}</span>
      </div>
    </div>
  );
}
