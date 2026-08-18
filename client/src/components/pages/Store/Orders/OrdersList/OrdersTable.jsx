"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";
import { StatusChip } from "@/components/shared/StatusChip";
import { ViewButton } from "@/components/shared/ViewButton";
import formatDate from "@lib/formatDate";

export function OrdersTable({ orders, formatAmount, onViewOrder }) {
  const ordersTranslations = useTranslations("orders");

  const columns = [
    {
      key: "id",
      label: ordersTranslations("table.id"),
      render: (order) => <span className="block max-w-20 truncate">{order.id}</span>,
    },
    {
      key: "user",
      label: ordersTranslations("table.user"),
      render: (order) => (
        <span className="font-medium text-deep">{order.userName || ordersTranslations("details.unassigned")}</span>
      ),
    },
    {
      key: "status",
      label: ordersTranslations("table.status"),
      render: (order) => <StatusChip status={order.status} />,
    },
    {
      key: "payment",
      label: ordersTranslations("table.paymentMethod"),
      render: (order) => (
        <span className="text-sm text-gray-700">{order.paymentMethod || ordersTranslations("details.noPayment")}</span>
      ),
    },
    {
      key: "total",
      label: ordersTranslations("table.total"),
      render: (order) => <span className="whitespace-nowrap">{formatAmount(order.total * 100)}</span>,
    },
    {
      key: "date",
      label: ordersTranslations("table.date"),
      render: (order) => (
        <span className="whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      label: ordersTranslations("table.actions"),
      className: "text-right",
      render: (order) => (
        <div className="flex justify-end">
          <ViewButton onPress={() => onViewOrder(order)}>{ordersTranslations("table.view")}</ViewButton>
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
