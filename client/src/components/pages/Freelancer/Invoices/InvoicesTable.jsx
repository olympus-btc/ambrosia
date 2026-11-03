"use client";

import {
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { formatInvoiceAmount, formatInvoicePeriod } from "./invoiceFormatters";

export function InvoicesTable({ invoices, onViewInvoice }) {
  const invoiceTranslations = useTranslations("freelanceInvoices");

  return (
    <Table className="min-w-[760px]" removeWrapper aria-label={invoiceTranslations("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3">{invoiceTranslations("number")}</TableColumn>
        <TableColumn className="py-2 px-3">{invoiceTranslations("client")}</TableColumn>
        <TableColumn className="py-2 px-3">{invoiceTranslations("period")}</TableColumn>
        <TableColumn className="py-2 px-3">{invoiceTranslations("status")}</TableColumn>
        <TableColumn className="py-2 px-3">{invoiceTranslations("paymentMethod")}</TableColumn>
        <TableColumn className="py-2 px-3 text-right">{invoiceTranslations("total")}</TableColumn>
        <TableColumn className="py-2 px-3 w-28 text-right">{invoiceTranslations("actions")}</TableColumn>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="max-w-[160px] truncate">{invoice.invoiceNumber}</TableCell>
            <TableCell className="max-w-[180px] truncate">{invoice.clientName}</TableCell>
            <TableCell>{formatInvoicePeriod(invoice)}</TableCell>
            <TableCell>
              <Chip size="sm" className="bg-green-200 text-xs text-green-800 border border-green-300">
                {invoiceTranslations(`statuses.${invoice.status}`)}
              </Chip>
            </TableCell>
            <TableCell>{invoiceTranslations(`paymentMethods.${invoice.paymentMethod}`)}</TableCell>
            <TableCell className="text-right font-medium">
              {formatInvoiceAmount(invoice.totalCents, invoice.currencyAcronym)}
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                <Button size="sm" variant="bordered" onPress={() => onViewInvoice(invoice)}>
                  {invoiceTranslations("view")}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
