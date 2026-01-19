"use client";

import { Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Eye, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

import formatDate from "@/lib/formatDate";

import { StatusChip } from "./StatusChip";

export function OrdersTable({ orders, formatAmount, onViewOrder }) {
  const t = useTranslations("orders");
  return (
    <Table
      removeWrapper
    >
      <TableHeader>
        <TableColumn className="py-2 px-3 w-[120px]">{t("table.id")}</TableColumn>
        <TableColumn className="py-2 px-3">{t("table.user")}</TableColumn>
        <TableColumn className="py-2 px-3">{t("table.status")}</TableColumn>
        <TableColumn className="py-2 px-3">{t("table.paymentMethod")}</TableColumn>
        <TableColumn className="py-2 px-3">{t("table.total")}</TableColumn>
        <TableColumn className="py-2 px-3">{t("table.date")}</TableColumn>
        <TableColumn className="py-2 px-3">{t("table.actions")}</TableColumn>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id} className="hover:bg-gray-50">
            <TableCell>
              <span className="block max-w-20 truncate">{order.id}</span>
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-deep">
                  {order.waiter || t("details.unassigned")}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <StatusChip status={order.status} />
            </TableCell>
            <TableCell>
              <span className="text-sm text-gray-700">
                {order.payment_method || t("details.noPayment")}
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap">{formatAmount(order.total * 100)}</TableCell>
            <TableCell className="whitespace-nowrap">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(order.created_at)}</span>
              </div>
            </TableCell>
            <TableCell>
              <Button variant="outline" color="primary" size="sm" onPress={() => onViewOrder(order)}>
                <Eye className="w-4 h-4 mr-1" />
                {t("table.view")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
