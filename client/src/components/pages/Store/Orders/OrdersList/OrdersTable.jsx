"use client";

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { useTranslations } from "next-intl";

import { ViewButton } from "@/components/shared/ViewButton";
import formatDate from "@/lib/formatDate";

import { StatusChip } from "./StatusChip";

export function OrdersTable({ orders, formatAmount, onViewOrder }) {
  const t = useTranslations("orders");
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[600px]" removeWrapper>
        <TableHeader>
          <TableColumn className="py-2 px-3 w-[120px]">{t("table.id")}</TableColumn>
          <TableColumn className="py-2 px-3 hidden md:table-cell">{t("table.user")}</TableColumn>
          <TableColumn className="py-2 px-3">{t("table.status")}</TableColumn>
          <TableColumn className="py-2 px-3 hidden md:table-cell">{t("table.paymentMethod")}</TableColumn>
          <TableColumn className="py-2 px-3">{t("table.total")}</TableColumn>
          <TableColumn className="py-2 px-3">{t("table.date")}</TableColumn>
          <TableColumn className="py-2 px-3 text-right">{t("table.actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-gray-50">
              <TableCell>
                <span className="block max-w-20 truncate">{order.id}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="font-medium text-deep">
                  {order.user_name || t("details.unassigned")}
                </span>
              </TableCell>
              <TableCell>
                <StatusChip status={order.status} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-sm text-gray-700">
                  {order.payment_method || t("details.noPayment")}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatAmount(order.total * 100)}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-gray-500">
                {formatDate(order.created_at)}
              </TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex justify-end">
                  <ViewButton onPress={() => onViewOrder(order)}>{t("table.view")}</ViewButton>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
