"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";
import { formatDateParts } from "@lib/formatDate";

import { SalesCard } from "./SalesCard";

export function SalesList({ sales, formatCurrency }) {
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
      render: (sale) => <span className="font-medium text-deep">{sale.productName}</span>,
    },
    {
      key: "user",
      label: reportsTranslations("sales.user"),
      render: (sale) => <span className="text-sm text-gray-700">{sale.userName ?? "—"}</span>,
    },
    {
      key: "qty",
      label: reportsTranslations("sales.quantity"),
      render: (sale) => <span className="font-bold">×{sale.quantity}</span>,
    },
    {
      key: "price",
      label: reportsTranslations("sales.price"),
      render: (sale) => <span className="whitespace-nowrap">{formatCurrency(sale.priceAtOrder)}</span>,
    },
    {
      key: "total",
      label: reportsTranslations("sales.total"),
      render: (sale) => (
        <span className="whitespace-nowrap font-bold text-green-700">
          {formatCurrency(sale.priceAtOrder * sale.quantity)}
        </span>
      ),
    },
    {
      key: "payment",
      label: reportsTranslations("sales.paymentMethod"),
      render: (sale) => <span className="text-sm text-gray-700">{sale.paymentMethod || reportsTranslations("payment.unknown")}</span>,
    },
    {
      key: "date",
      label: reportsTranslations("sales.date"),
      render: (sale) => (
        <span className="text-xs text-gray-400">{formatDateParts(sale.saleDate).date}</span>
      ),
    },
    {
      key: "time",
      label: reportsTranslations("sales.time"),
      render: (sale) => (
        <span className="text-xs text-gray-400">{formatDateParts(sale.saleDate).time}</span>
      ),
    },
  ];

  return (
    <section aria-label={reportsTranslations("sales.tableAriaLabel")} className="w-full">
      <div className="md:hidden space-y-3">
        {sales.map((sale, saleIndex) => (
          <SalesCard key={saleIndex} sale={sale} formatCurrency={formatCurrency} />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <DataTable
          columns={columns}
          items={sales}
          getKey={(_, rowIndex) => String(rowIndex)}
        />
      </div>
    </section>
  );
}
