"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";
import { parseUtcDate } from "@lib/formatDate";

const formatDateOnly = (dateString) => {
  const d = parseUtcDate(dateString);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
};

const formatTimeOnly = (dateString) => {
  const d = parseUtcDate(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
};

import { SalesCard } from "./SalesCard";

export function SalesList({ sales, formatCurrency }) {
  const t = useTranslations("reports");

  if (!sales?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShoppingBag aria-hidden="true" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{t("sales.empty")}</p>
      </div>
    );
  }

  const columns = [
    {
      key: "product",
      label: t("sales.product"),
      render: (sale) => <span className="font-medium text-deep">{sale.productName}</span>,
    },
    {
      key: "user",
      label: t("sales.user"),
      render: (sale) => <span className="text-sm text-gray-700">{sale.userName ?? "—"}</span>,
    },
    {
      key: "qty",
      label: t("sales.quantity"),
      render: (sale) => <span className="font-bold">×{sale.quantity}</span>,
    },
    {
      key: "price",
      label: t("sales.price"),
      render: (sale) => <span className="whitespace-nowrap">{formatCurrency(sale.priceAtOrder)}</span>,
    },
    {
      key: "total",
      label: t("sales.total"),
      render: (sale) => (
        <span className="whitespace-nowrap font-bold text-green-700">
          {formatCurrency(sale.priceAtOrder * sale.quantity)}
        </span>
      ),
    },
    {
      key: "payment",
      label: t("sales.paymentMethod"),
      render: (sale) => <span className="text-sm text-gray-700">{sale.paymentMethod || t("payment.unknown")}</span>,
    },
    {
      key: "date",
      label: t("sales.date"),
      render: (sale) => (
        <span className="text-xs text-gray-400">{sale.saleDate ? formatDateOnly(sale.saleDate) : "-"}</span>
      ),
    },
    {
      key: "time",
      label: t("sales.time"),
      render: (sale) => (
        <span className="text-xs text-gray-400">{sale.saleDate ? formatTimeOnly(sale.saleDate) : ""}</span>
      ),
    },
  ];

  return (
    <section aria-label={t("sales.tableAriaLabel")} className="w-full">
      <div className="md:hidden space-y-3">
        {sales.map((sale, i) => (
          <SalesCard key={i} sale={sale} formatCurrency={formatCurrency} />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <DataTable
          columns={columns}
          items={sales}
          getKey={(_, i) => String(i)}
        />
      </div>
    </section>
  );
}
