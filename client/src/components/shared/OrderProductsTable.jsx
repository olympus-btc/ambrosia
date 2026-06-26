"use client";

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";

export function OrderProductsTable({ items, formatAmount, labels }) {
  return (
    <Table
      removeWrapper
      aria-label={labels.products}
      classNames={{ th: "text-xs text-gray-400 bg-transparent font-medium px-1 whitespace-nowrap", td: "px-1" }}
    >
      <TableHeader>
        <TableColumn align="start">{labels.products}</TableColumn>
        <TableColumn align="center">{labels.quantity}</TableColumn>
        <TableColumn align="end">{labels.unitPrice}</TableColumn>
        <TableColumn align="end">{labels.subtotal}</TableColumn>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={index}>
            <TableCell className="py-2 text-gray-700">{item.productName}</TableCell>
            <TableCell className="py-2 text-center text-gray-500">×{item.quantity}</TableCell>
            <TableCell className="py-2 text-right text-gray-500">{formatAmount(item.priceAtOrder)}</TableCell>
            <TableCell className="py-2 text-right font-semibold">{formatAmount(item.quantity * item.priceAtOrder)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
