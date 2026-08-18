"use client";

import { Card, CardBody } from "@heroui/react";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/components/shared/StatusChip";
import { ViewButton } from "@/components/shared/ViewButton";
import formatDate from "@lib/formatDate";

export function OrdersCard({ order, formatAmount, onViewOrder }) {
  const ordersTranslations = useTranslations("orders");
  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-row items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-green-900 truncate">
            {order.userName || ordersTranslations("details.unassigned")}
          </p>
          <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
          <div className="flex items-center gap-2 mt-1">
            <StatusChip status={order.status} />
            <span className="text-xs text-gray-500">
              {order.paymentMethod || ordersTranslations("details.noPayment")}
            </span>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <p className="text-sm font-semibold text-gray-800">{formatAmount(order.total * 100)}</p>
          <ViewButton onPress={() => onViewOrder(order)}>{ordersTranslations("table.view")}</ViewButton>
        </div>
      </CardBody>
    </Card>
  );
}
