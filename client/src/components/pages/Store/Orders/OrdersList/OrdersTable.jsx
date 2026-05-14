"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";
import { ViewButton } from "@/components/shared/ViewButton";
import formatDate from "@lib/formatDate";

import { StatusChip } from "./StatusChip";

export function OrdersTable({ orders, formatAmount, onViewOrder }) {
  const t = useTranslations("orders");

  const columns = [
    {
      key: "id",
      label: t("table.id"),
      render: (o) => <span className="block max-w-20 truncate">{o.id}</span>,
    },
    {
      key: "user",
      label: t("table.user"),
      render: (o) => (
        <span className="font-medium text-deep">{o.userName || t("details.unassigned")}</span>
      ),
    },
    {
      key: "status",
      label: t("table.status"),
      render: (o) => <StatusChip status={o.status} />,
    },
    {
      key: "payment",
      label: t("table.paymentMethod"),
      render: (o) => (
        <span className="text-sm text-gray-700">{o.paymentMethod || t("details.noPayment")}</span>
      ),
    },
    {
      key: "total",
      label: t("table.total"),
      render: (o) => <span className="whitespace-nowrap">{formatAmount(o.total * 100)}</span>,
    },
    {
      key: "date",
      label: t("table.date"),
      render: (o) => (
        <span className="whitespace-nowrap text-sm text-gray-500">{formatDate(o.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      label: t("table.actions"),
      className: "text-right",
      render: (o) => (
        <div className="flex justify-end">
          <ViewButton onPress={() => onViewOrder(o)}>{t("table.view")}</ViewButton>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} items={orders} getKey={(o) => o.id} />;
}
