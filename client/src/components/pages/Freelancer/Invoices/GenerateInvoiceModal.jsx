"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  DateInput,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useTranslations } from "next-intl";

import { useBitcoinPrice } from "@/components/hooks/useBitcoinPrice";

import {
  formatPayoutAccountName,
  getCurrencyAcronymForClient,
  getInvoiceClientPaymentMethod,
} from "./invoiceFormatters";

const EMPTY_INVOICE_FORM = {
  clientId: "",
  periodStart: "",
  periodEnd: "",
  payoutAccountId: "",
};

function toDateInputValue(dateValue) {
  if (!dateValue) return null;
  try {
    return parseDate(dateValue);
  } catch {
    return null;
  }
}

function toDateString(dateValue) {
  return dateValue?.toString?.() || "";
}

export function GenerateInvoiceModal({
  clients,
  currencies,
  isOpen,
  onClose,
  onSubmit,
  payoutAccounts,
}) {
  const invoiceTranslations = useTranslations("freelanceInvoices");
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === invoiceForm.clientId) || null,
    [clients, invoiceForm.clientId],
  );
  const selectedClientPaymentMethod = getInvoiceClientPaymentMethod(selectedClient);
  const selectedCurrencyAcronym = getCurrencyAcronymForClient(selectedClient, currencies);
  const bankPayoutAccounts = useMemo(
    () => payoutAccounts.filter((payoutAccount) => payoutAccount.type === "bank"),
    [payoutAccounts],
  );
  const { currentRate, isLoading: bitcoinRateLoading } = useBitcoinPrice({
    currencyAcronym: selectedClientPaymentMethod === "lightning" ? selectedCurrencyAcronym : null,
  });

  useEffect(() => {
    if (!isOpen) {
      setInvoiceForm(EMPTY_INVOICE_FORM);
      return;
    }

    setInvoiceForm((previousInvoiceForm) => ({
      ...previousInvoiceForm,
      clientId: previousInvoiceForm.clientId || clients[0]?.id || "",
      payoutAccountId: previousInvoiceForm.payoutAccountId || bankPayoutAccounts[0]?.id || "",
    }));
  }, [bankPayoutAccounts, clients, isOpen]);

  const hasInvalidDateRange = Boolean(
    invoiceForm.periodStart &&
    invoiceForm.periodEnd &&
    invoiceForm.periodStart > invoiceForm.periodEnd,
  );
  const needsBankPayoutAccount = selectedClientPaymentMethod === "bank";
  const needsBitcoinRate = selectedClientPaymentMethod === "lightning";
  const canSubmit = Boolean(
    invoiceForm.clientId &&
    invoiceForm.periodStart &&
    invoiceForm.periodEnd &&
    !hasInvalidDateRange &&
    (!needsBankPayoutAccount || invoiceForm.payoutAccountId) &&
    (!needsBitcoinRate || currentRate),
  );

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isSubmittingRef.current || !canSubmit) return;

    const invoiceRequest = {
      clientId: invoiceForm.clientId,
      periodStart: invoiceForm.periodStart,
      periodEnd: invoiceForm.periodEnd,
    };

    if (needsBankPayoutAccount) {
      invoiceRequest.payoutAccountId = invoiceForm.payoutAccountId;
    }

    if (needsBitcoinRate) {
      invoiceRequest.exchangeRate = currentRate;
      invoiceRequest.exchangeRateCurrency = selectedCurrencyAcronym.toLowerCase();
    }

    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      await onSubmit(invoiceRequest);
      onClose();
    } catch {
      return;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextOpenState) => {
        if (!nextOpenState) onClose();
      }}
      placement="center"
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader>{invoiceTranslations("generate.title")}</ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Select
              label={invoiceTranslations("generate.clientLabel")}
              selectedKeys={invoiceForm.clientId ? [invoiceForm.clientId] : []}
              isRequired
              onSelectionChange={(selectedClientKeys) => {
                const selectedClientId = Array.from(selectedClientKeys)[0] || "";
                setInvoiceForm((previousInvoiceForm) => ({
                  ...previousInvoiceForm,
                  clientId: selectedClientId,
                }));
              }}
            >
              {clients.map((client) => (
                <SelectItem key={client.id}>{client.name}</SelectItem>
              ))}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInput
                label={invoiceTranslations("generate.periodStartLabel")}
                value={toDateInputValue(invoiceForm.periodStart)}
                isRequired
                onChange={(periodStartValue) => {
                  setInvoiceForm((previousInvoiceForm) => ({
                    ...previousInvoiceForm,
                    periodStart: toDateString(periodStartValue),
                  }));
                }}
              />
              <DateInput
                label={invoiceTranslations("generate.periodEndLabel")}
                value={toDateInputValue(invoiceForm.periodEnd)}
                isRequired
                isInvalid={hasInvalidDateRange}
                errorMessage={hasInvalidDateRange ? invoiceTranslations("generate.periodError") : ""}
                onChange={(periodEndValue) => {
                  setInvoiceForm((previousInvoiceForm) => ({
                    ...previousInvoiceForm,
                    periodEnd: toDateString(periodEndValue),
                  }));
                }}
              />
            </div>

            {needsBankPayoutAccount && (
              <Select
                label={invoiceTranslations("generate.payoutAccountLabel")}
                selectedKeys={invoiceForm.payoutAccountId ? [invoiceForm.payoutAccountId] : []}
                isRequired
                errorMessage={invoiceTranslations("generate.payoutAccountError")}
                isInvalid={bankPayoutAccounts.length === 0}
                onSelectionChange={(selectedPayoutAccountKeys) => {
                  const selectedPayoutAccountId = Array.from(selectedPayoutAccountKeys)[0] || "";
                  setInvoiceForm((previousInvoiceForm) => ({
                    ...previousInvoiceForm,
                    payoutAccountId: selectedPayoutAccountId,
                  }));
                }}
              >
                {bankPayoutAccounts.map((payoutAccount) => (
                  <SelectItem key={payoutAccount.id}>
                    {formatPayoutAccountName(payoutAccount) || invoiceTranslations("generate.unnamedPayoutAccount")}
                  </SelectItem>
                ))}
              </Select>
            )}

            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-green-900">{invoiceTranslations("generate.summaryTitle")}</p>
              <p className="text-sm text-green-900">
                {invoiceTranslations("generate.paymentMethodSummary", {
                  paymentMethod: selectedClientPaymentMethod
                    ? invoiceTranslations(`paymentMethods.${selectedClientPaymentMethod}`)
                    : "-",
                })}
              </p>
              {needsBitcoinRate && (
                <p className="text-sm text-green-900">
                  {bitcoinRateLoading
                    ? invoiceTranslations("generate.loadingBitcoinRate")
                    : invoiceTranslations("generate.bitcoinRateSummary", {
                      currency: selectedCurrencyAcronym,
                      rate: currentRate ?? "-",
                    })}
                </p>
              )}
              <p className="text-xs text-green-800">{invoiceTranslations("generate.confirmationNote")}</p>
            </div>

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={onClose}
                isDisabled={isSubmitting}
              >
                {invoiceTranslations("generate.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isDisabled={isSubmitting || !canSubmit}
                isLoading={isSubmitting}
              >
                {invoiceTranslations("generate.submitButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
