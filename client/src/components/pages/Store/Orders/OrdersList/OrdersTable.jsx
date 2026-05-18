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
      render: (order) => <span className="block max-w-20 truncate">{order.id}</span>,
    },
    {
      key: "user",
      label: t("table.user"),
      render: (order) => (
        <span className="font-medium text-deep">{order.userName || t("details.unassigned")}</span>
      ),
    },
    {
      key: "status",
      label: t("table.status"),
      render: (order) => <StatusChip status={order.status} />,
    },
    {
      key: "payment",
      label: t("table.paymentMethod"),
      render: (order) => (
        <span className="text-sm text-gray-700">{order.paymentMethod || t("details.noPayment")}</span>
      ),
    },
    {
      key: "total",
      label: t("table.total"),
      render: (order) => <span className="whitespace-nowrap">{formatAmount(order.total * 100)}</span>,
    },
    {
      key: "date",
      label: t("table.date"),
      render: (order) => (
        <span className="whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      label: t("table.actions"),
      className: "text-right",
      render: (order) => (
        <div className="flex justify-end">
          <ViewButton onPress={() => onViewOrder(order)}>{t("table.view")}</ViewButton>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      items={orders}
      getKey={(order) => order.id}
    />
  );
}
