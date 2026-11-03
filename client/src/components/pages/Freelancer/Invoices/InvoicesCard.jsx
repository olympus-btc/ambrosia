"use client";

import { Button, Card, CardBody, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { formatInvoiceAmount, formatInvoicePeriod } from "./invoiceFormatters";

export function InvoicesCard({ invoice, onViewInvoice }) {
  const invoiceTranslations = useTranslations("freelanceInvoices");

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-sm truncate">{invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-500 truncate">{invoice.clientName}</p>
            <p className="text-xs text-gray-500">{formatInvoicePeriod(invoice)}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Chip size="sm" className="bg-green-200 text-xs text-green-800 border border-green-300">
                {invoiceTranslations(`statuses.${invoice.status}`)}
              </Chip>
              <Chip size="sm" className="bg-gray-100 text-xs text-gray-700 border border-gray-200">
                {invoiceTranslations(`paymentMethods.${invoice.paymentMethod}`)}
              </Chip>
            </div>
          </div>
          <div className="shrink-0 text-right space-y-2">
            <p className="text-sm font-semibold text-green-900">
              {formatInvoiceAmount(invoice.totalCents, invoice.currencyAcronym)}
            </p>
            <Button size="sm" variant="bordered" onPress={() => onViewInvoice(invoice)}>
              {invoiceTranslations("view")}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
