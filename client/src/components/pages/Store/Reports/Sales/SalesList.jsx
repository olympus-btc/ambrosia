"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";
import formatDate from "@lib/formatDate";

import { PaymentBadge } from "./PaymentBadge";
import { SalesCard } from "./SalesCard";

export function SalesList({ sales, formatCurrency }) {
  const t = useTranslations("reports");

  if (!sales?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{t("sales.empty")}</p>
      </div>
    );
  }

  const columns = [
    {
      key: "product",
      label: t("sales.product"),
      render: (s) => <span className="font-medium text-deep">{s.productName}</span>,
    },
    {
      key: "user",
      label: t("sales.user"),
      render: (s) => <span className="text-sm text-gray-700">{s.userName ?? "—"}</span>,
    },
    {
      key: "qty",
      label: t("sales.quantity"),
      render: (s) => <span className="font-bold">×{s.quantity}</span>,
    },
    {
      key: "price",
      label: t("sales.price"),
      render: (s) => <span className="whitespace-nowrap">{formatCurrency(s.priceAtOrder)}</span>,
    },
    {
      key: "total",
      label: t("sales.total"),
      render: (s) => (
        <span className="whitespace-nowrap font-bold text-green-700">
          {formatCurrency(s.priceAtOrder * s.quantity)}
        </span>
      ),
    },
    {
      key: "payment",
      label: t("sales.paymentMethod"),
      render: (s) => <PaymentBadge method={s.paymentMethod} />,
    },
    {
      key: "date",
      label: t("sales.date"),
      render: (s) => (
        <span className="text-xs text-gray-400">{s.saleDate ? formatDate(s.saleDate) : "-"}</span>
      ),
    },
  ];

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {sales.map((sale, i) => (
          <SalesCard key={i} sale={sale} formatCurrency={formatCurrency} />
        ))}
      </div>
      <div className="hidden md:block">
        <DataTable columns={columns} items={sales} getKey={(_, i) => String(i)} />
      </div>
    </section>
  );
}
