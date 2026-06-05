"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { DataTable } from "@/components/shared/DataTable";
import { formatDateParts } from "@lib/formatDate";

import { SalesCard } from "./SalesCard";

export function SalesList({ sales, formatCurrency, currentRate }) {
  const reportsTranslations = useTranslations("reports");

  if (!sales?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShoppingBag aria-hidden="true" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{reportsTranslations("sales.empty")}</p>
      </div>
    );
  }

  const columns = [
    {
      key: "product",
      label: reportsTranslations("sales.product"),
      render: ({ productName }) => <span className="font-medium text-deep">{productName}</span>,
    },
    {
      key: "user",
      label: reportsTranslations("sales.user"),
      render: ({ userName }) => <span className="text-sm text-gray-700">{userName ?? "—"}</span>,
    },
    {
      key: "qty",
      label: reportsTranslations("sales.quantity"),
      render: ({ quantity }) => <span className="font-bold">×{quantity}</span>,
    },
    {
      key: "price",
      label: reportsTranslations("sales.price"),
      render: ({ priceAtOrder }) => <span className="whitespace-nowrap">{formatCurrency(priceAtOrder)}</span>,
    },
    {
      key: "total",
      label: reportsTranslations("sales.total"),
      render: ({ satoshiAmount, exchangeRateAtPayment, exchangeRateCurrency, fiatAmountAtPayment, priceAtOrder, quantity }) => {
        if (satoshiAmount != null) {
          return (
            <div className="font-bold text-green-700">
              <AmountDisplay
                satoshis={satoshiAmount}
                exchangeRateAtSale={exchangeRateAtPayment}
                exchangeRateCurrency={exchangeRateCurrency}
                fiatAmountAtPayment={fiatAmountAtPayment}
                currentRate={currentRate}
              />
            </div>
          );
        }
        return (
          <span className="whitespace-nowrap font-bold text-green-700">
            {formatCurrency(priceAtOrder * quantity)}
          </span>
        );
      },
    },
    {
      key: "payment",
      label: reportsTranslations("sales.paymentMethod"),
      render: ({ paymentMethod }) => <span className="text-sm text-gray-700">{paymentMethod || reportsTranslations("payment.unknown")}</span>,
    },
    {
      key: "date",
      label: reportsTranslations("sales.date"),
      render: ({ saleDate }) => (
        <span className="text-xs text-gray-400">{formatDateParts(saleDate).date}</span>
      ),
    },
    {
      key: "time",
      label: reportsTranslations("sales.time"),
      render: ({ saleDate }) => (
        <span className="text-xs text-gray-400">{formatDateParts(saleDate).time}</span>
      ),
    },
  ];

  return (
    <section aria-label={reportsTranslations("sales.tableAriaLabel")} className="w-full">
      <div className="md:hidden space-y-3">
        {sales.map((sale) => (
          <SalesCard key={`${sale.orderId}-${sale.productName}`} sale={sale} formatCurrency={formatCurrency} currentRate={currentRate} />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <DataTable
          columns={columns}
          items={sales}
          getKey={(sale) => `${sale.orderId}-${sale.productName}`}
        />
      </div>
    </section>
  );
}
