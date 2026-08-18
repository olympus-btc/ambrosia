"use client";
import { NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { toNumberInputValue } from "@/components/utils/numberParsers";

export function CashRefundFields({
  orderTotalCents,
  cashGiven,
  onCashGivenChange,
  cashDifferenceCents,
  isCashAmountExact,
  formatAmount,
}) {
  const ordersTranslations = useTranslations("orders");

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {ordersTranslations("details.refundAmountLabel")}:{" "}
        <span className="font-mono">{formatAmount(orderTotalCents)}</span>
      </p>
      <NumberInput
        label={ordersTranslations("details.cashGivenLabel")}
        value={cashGiven}
        onValueChange={onCashGivenChange}
        onChange={(cashGivenChange) => {
          onCashGivenChange(Math.min(toNumberInputValue(cashGivenChange), 9999999));
        }}
        minValue={0}
        maxValue={9999999}
        formatOptions={{ useGrouping: true, maximumFractionDigits: 2 }}
        step={0.01}
        startContent={<span className="text-default-400 text-small">$</span>}
        classNames={{ inputWrapper: "shadow-none" }}
      />
      <div className="bg-white rounded-lg border p-3 flex justify-between items-center">
        <span className="text-sm text-gray-600">{ordersTranslations("details.differenceLabel")}</span>
        <span className={`text-sm font-semibold ${isCashAmountExact ? "text-green-700" : "text-red-600"}`}>
          {formatAmount(cashDifferenceCents)}
        </span>
      </div>
    </div>
  );
}
