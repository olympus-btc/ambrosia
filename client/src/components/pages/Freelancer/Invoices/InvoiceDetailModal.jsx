"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import {
  formatInvoiceAmount,
  formatInvoiceDuration,
  formatInvoicePeriod,
  parsePayoutSnapshot,
} from "./invoiceFormatters";

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words">{value || "-"}</p>
    </div>
  );
}

function BankPaymentDetails({ invoice }) {
  const invoiceTranslations = useTranslations("freelanceInvoices");
  const payoutSnapshot = parsePayoutSnapshot(invoice?.payoutSnapshot);

  if (!payoutSnapshot) return null;

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <p className="text-sm font-semibold text-green-900">{invoiceTranslations("bankDetails")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailRow label={invoiceTranslations("accountHolder")} value={payoutSnapshot.accountHolder} />
        <DetailRow label={invoiceTranslations("bankName")} value={payoutSnapshot.bankName} />
        <DetailRow label={invoiceTranslations("accountNumber")} value={payoutSnapshot.accountNumber} />
        <DetailRow label={invoiceTranslations("clabe")} value={payoutSnapshot.clabe} />
        <DetailRow label={invoiceTranslations("swift")} value={payoutSnapshot.swift} />
        <DetailRow label={invoiceTranslations("iban")} value={payoutSnapshot.iban} />
      </div>
    </div>
  );
}

function LightningPaymentDetails({ invoice }) {
  const invoiceTranslations = useTranslations("freelanceInvoices");

  if (!invoice?.bolt11) return null;

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <p className="text-sm font-semibold text-green-900">{invoiceTranslations("lightningDetails")}</p>
      <p className="text-xs font-mono bg-gray-100 rounded p-2 break-all">{invoice.bolt11}</p>
    </div>
  );
}

export function InvoiceDetailModal({ invoice, isLoading, isOpen, onClose }) {
  const invoiceTranslations = useTranslations("freelanceInvoices");

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextOpenState) => {
        if (!nextOpenState) onClose();
      }}
      size="3xl"
      scrollBehavior="inside"
      placement="center"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{invoiceTranslations("detailTitle")}</ModalHeader>
        <ModalBody className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <DetailRow label={invoiceTranslations("number")} value={invoice?.invoiceNumber} />
                <DetailRow label={invoiceTranslations("client")} value={invoice?.clientName} />
                <DetailRow label={invoiceTranslations("period")} value={formatInvoicePeriod(invoice)} />
                <DetailRow
                  label={invoiceTranslations("status")}
                  value={invoice ? invoiceTranslations(`statuses.${invoice.status}`) : ""}
                />
                <DetailRow
                  label={invoiceTranslations("paymentMethod")}
                  value={invoice ? invoiceTranslations(`paymentMethods.${invoice.paymentMethod}`) : ""}
                />
                <DetailRow
                  label={invoiceTranslations("total")}
                  value={formatInvoiceAmount(invoice?.totalCents, invoice?.currencyAcronym)}
                />
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-[1fr_92px_104px_104px] gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                  <span>{invoiceTranslations("lineItem")}</span>
                  <span>{invoiceTranslations("duration")}</span>
                  <span>{invoiceTranslations("rate")}</span>
                  <span className="text-right">{invoiceTranslations("amount")}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {(invoice?.lineItems ?? []).map((lineItem) => (
                    <div
                      key={lineItem.id}
                      className="grid grid-cols-[1fr_92px_104px_104px] gap-2 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        {lineItem.projectName} / {lineItem.taskName}
                      </span>
                      <span>{formatInvoiceDuration(lineItem.quantityMinutes)}</span>
                      <span>{formatInvoiceAmount(lineItem.rateCents, invoice?.currencyAcronym)}</span>
                      <span className="text-right font-medium">
                        {formatInvoiceAmount(lineItem.amountCents, invoice?.currencyAcronym)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {invoice?.paymentMethod === "bank" && (
                <BankPaymentDetails invoice={invoice} />
              )}
              {invoice?.paymentMethod === "lightning" && (
                <LightningPaymentDetails invoice={invoice} />
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={onClose}
          >
            {invoiceTranslations("close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
