"use client";

import { Button } from "@heroui/react";
import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function MobileSummaryBar({ cart, total, onCheckout }) {
  const t = useTranslations("cart");
  const { formatAmount } = useCurrency();

  if (!cart.length) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-20 md:hidden bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-green-800" />
            <span className="absolute -top-2 -right-2 bg-green-800 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
              {cart.length}
            </span>
          </div>
          <span className="font-bold text-green-900 text-lg">{formatAmount(total)}</span>
        </div>
        <Button color="primary" onPress={onCheckout}>
          {t("summary.viewCart")}
        </Button>
      </div>
    </div>
  );
}
