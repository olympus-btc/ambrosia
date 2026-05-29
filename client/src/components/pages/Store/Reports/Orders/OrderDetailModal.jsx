"use client";
import {
  Modal, ModalBody, ModalContent, ModalHeader,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import formatDate from "@lib/formatDate";

export function OrderDetailModal({ order, formatCurrency, onClose }) {
  const reportsTranslations = useTranslations("reports");

  return (
    <Modal
      isOpen={Boolean(order)}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        base: "my-auto",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0.5 pb-2">
          <span>{reportsTranslations("orders.detailTitle")}</span>
          {order && <span className="font-mono text-sm font-normal text-gray-400">#{order.shortId}</span>}
        </ModalHeader>
        <ModalBody className="pb-6">
          {order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">{reportsTranslations("sales.date")}</p>
                  <p className="font-medium">{formatDate(order.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{reportsTranslations("sales.user")}</p>
                  <p className="font-medium">{order.userName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{reportsTranslations("sales.paymentMethod")}</p>
                  <p className="font-medium">{order.paymentMethod || reportsTranslations("payment.unknown")}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <Table
                  removeWrapper
                  aria-label={reportsTranslations("orders.detailTitle")}
                  classNames={{ th: "text-xs text-gray-400 bg-transparent font-medium px-0", td: "px-0" }}
                >
                  <TableHeader>
                    <TableColumn align="start">{reportsTranslations("orders.products")}</TableColumn>
                    <TableColumn align="center">{reportsTranslations("sales.quantity")}</TableColumn>
                    <TableColumn align="end">{reportsTranslations("sales.price")}</TableColumn>
                    <TableColumn align="end">{reportsTranslations("orders.subtotal")}</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item, itemIndex) => (
                      <TableRow key={itemIndex}>
                        <TableCell className="py-2 text-gray-700">{item.productName}</TableCell>
                        <TableCell className="py-2 text-center text-gray-500">×{item.quantity}</TableCell>
                        <TableCell className="py-2 text-right text-gray-500">{formatCurrency(item.priceAtOrder)}</TableCell>
                        <TableCell className="py-2 text-right font-semibold">{formatCurrency(item.quantity * item.priceAtOrder)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-semibold text-sm">{reportsTranslations("orders.total")}</span>
                <span className="font-bold text-green-700">{formatCurrency(order.total)}</span>
              </div>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
