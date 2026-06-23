import { Divider } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function CartTotals({ subtotal, discountAmount, total }) {
  const translateCart = useTranslations("cart");
  const { formatAmount } = useCurrency();

  return (
    <div className="space-y-2 text-sm text-gray-800">
      <div className="flex justify-between">
        <span>{translateCart("summary.subtotal")}</span>
        <span>{formatAmount(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>{translateCart("summary.discount")}</span>
        <span>{formatAmount(discountAmount)}</span>
      </div>
      <Divider className="bg-green-600" />
      <div className="flex justify-between items-center font-semibold text-green-900">
        <span>{translateCart("summary.total")}:</span>
        <span className="text-lg">{formatAmount(total)}</span>
      </div>
    </div>
  );
}
