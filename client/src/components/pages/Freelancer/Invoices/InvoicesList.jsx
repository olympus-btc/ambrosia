"use client";

import { useTranslations } from "next-intl";

import { InvoicesCard } from "./InvoicesCard";
import { InvoicesTable } from "./InvoicesTable";

export function InvoicesList({ invoices, onViewInvoice }) {
  const invoiceTranslations = useTranslations("freelanceInvoices");

  if (invoices.length === 0) {
    return <p className="text-center text-gray-500 py-12">{invoiceTranslations("emptyState")}</p>;
  }

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {invoices.map((invoice) => (
          <InvoicesCard key={invoice.id} invoice={invoice} onViewInvoice={onViewInvoice} />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <InvoicesTable invoices={invoices} onViewInvoice={onViewInvoice} />
      </div>
    </section>
  );
}
