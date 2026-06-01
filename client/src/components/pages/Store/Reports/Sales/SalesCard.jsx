"use client";

import { Card, CardBody } from "@heroui/react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/shared/AmountDisplay";
import formatDate from "@lib/formatDate";

export function SalesCard({ sale, formatCurrency, currentRate }) {
  const reportsTranslations = useTranslations("reports");
  const {
    productName,
    userName,
    paymentMethod,
    saleDate,
    quantity,
    priceAtOrder,
    satoshiAmount,
    exchangeRateAtPayment,
    exchangeRateCurrency,
    fiatAmountAtPayment,
  } = sale;

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody>
        <p className="font-bold text-deep">{productName}</p>
        <div className="flex items-center gap-1 text-sm text-forest mt-0.5">
          <Users aria-hidden="true" className="w-3 h-3 shrink-0" />
          <span className="truncate">{userName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          <span className="text-sm text-gray-700">{paymentMethod}</span>
          <span className="text-xs text-gray-400">
            {saleDate ? formatDate(saleDate) : "-"}
          </span>
        </div>
        <div className="mt-1">
          <p className="text-xs text-gray-500">{reportsTranslations("sales.quantity")} ×{quantity}</p>
          <div className="text-sm font-bold text-green-700 mt-1">
            {satoshiAmount != null
              ? (
                <AmountDisplay
                  satoshis={satoshiAmount}
                  exchangeRateAtSale={exchangeRateAtPayment}
                  exchangeRateCurrency={exchangeRateCurrency}
                  fiatAmountAtPayment={fiatAmountAtPayment}
                  currentRate={currentRate}
                />
                )
              : formatCurrency(priceAtOrder * quantity)}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
