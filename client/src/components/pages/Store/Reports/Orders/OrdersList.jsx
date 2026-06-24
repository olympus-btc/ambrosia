"use client";
import { useState } from "react";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";
import { ViewButton } from "@/components/shared/ViewButton";
import { formatDateParts } from "@lib/formatDate";

import { OrderDetailModal } from "./OrderDetailModal";
import { OrdersCard } from "./OrdersCard";

const buildProductSummary = (items, overflowLabel) => {
  if (!items.length) return "—";
  const names = items.slice(0, 2).map((item) => item.productName);
  const overflow = items.length - 2;
  if (overflow > 0) return `${names.join(", ")} +${overflow} ${overflowLabel}`;
  return names.join(", ");
};

export function ReportsOrdersList({ orders, formatCurrency, currentRate }) {
  const reportsTranslations = useTranslations("reports");
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (!orders?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShoppingCart aria-hidden="true" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{reportsTranslations("orders.empty")}</p>
      </div>
    );
  }

  const columns = [
    {
      key: "id",
      label: reportsTranslations("orders.shortId"),
      render: ({ shortId }) => (
        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          #{shortId}
        </span>
      ),
    },
    {
      key: "date",
      label: reportsTranslations("sales.date"),
      render: ({ date: orderDate }) => {
        const { date, time } = formatDateParts(orderDate);
        return (
          <div className="text-xs">
            <span className="text-gray-700">{date}</span>
            <span className="text-gray-400 ml-1">{time}</span>
          </div>
        );
      },
    },
    {
      key: "user",
      label: reportsTranslations("sales.user"),
      render: ({ userName }) => <span className="text-sm text-gray-700">{userName ?? "—"}</span>,
    },
    {
      key: "products",
      label: reportsTranslations("orders.products"),
      render: ({ items }) => (
        <span className="text-sm text-deep">{buildProductSummary(items, reportsTranslations("orders.more"))}</span>
      ),
    },
    {
      key: "items",
      label: reportsTranslations("sales.quantity"),
      render: ({ itemCount }) => <span className="font-bold">×{itemCount}</span>,
    },
    {
      key: "total",
      label: reportsTranslations("orders.total"),
      render: ({ total }) => (
        <span className="whitespace-nowrap font-bold text-green-700">{formatCurrency(total)}</span>
      ),
    },
    {
      key: "payment",
      label: reportsTranslations("sales.paymentMethod"),
      render: ({ paymentMethod }) => (
        <span className="text-sm text-gray-700">{paymentMethod || reportsTranslations("payment.unknown")}</span>
      ),
    },
    {
      key: "actions",
      label: reportsTranslations("orders.actions"),
      className: "text-right",
      render: (order) => (
        <div className="flex justify-end">
          <ViewButton onPress={() => setSelectedOrder(order)}>
            {reportsTranslations("orders.view")}
          </ViewButton>
        </div>
      ),
    },
  ];

  return (
    <section aria-label={reportsTranslations("orders.tableAriaLabel")} className="w-full">
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <OrdersCard
            key={order.orderId}
            order={order}
            formatCurrency={formatCurrency}
            onClick={() => setSelectedOrder(order)}
          />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <DataTable
          columns={columns}
          items={orders}
          getKey={(order) => order.orderId}
        />
      </div>
      <OrderDetailModal
        order={selectedOrder}
        formatCurrency={formatCurrency}
        currentRate={currentRate}
        onClose={() => setSelectedOrder(null)}
      />
    </section>
  );
}
