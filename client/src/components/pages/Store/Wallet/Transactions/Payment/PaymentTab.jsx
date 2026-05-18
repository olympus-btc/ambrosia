"use client";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useSendPaymentFlow } from "./hooks/useSendPaymentFlow";
import { PaymentConfirmModal } from "./PaymentConfirmModal";
import { PaymentForm } from "./PaymentForm";
import { getPaymentErrorDescription } from "./utils/paymentErrors";
import { getBolt11ValidationError } from "./utils/validateBolt11Invoice";

export function PaymentTab({ fetchInfo, fetchTransactions }) {
  const t = useTranslations("wallet");
  const {
    decodedInvoice,
    invoiceValidationError,
    isConfirmOpen,
    isLoading,
    payInvoice,
    paymentResult,
    actions,
  } = useSendPaymentFlow({
    fetchInfo,
    fetchTransactions,
    validateInvoice: (invoiceValue) => getBolt11ValidationError(invoiceValue, t),
  });

  const handleOpenConfirm = async () => {
    const result = await actions.openConfirm();

    if (result?.status === "decode_error") {
      addToast({
        title: t("payments.send.paymentError"),
        description: t("payments.send.confirmModal.decodingError"),
        variant: "solid",
        color: "danger",
      });
    }
  };

  const handleConfirmPayment = async (customAmountSat) => {
    const result = await actions.confirmPayment(customAmountSat);

    if (result?.status === "success") {
      addToast({
        title: t("payments.send.paySuccessTitle"),
        description: t("payments.send.paySuccessDescription"),
        variant: "solid",
        color: "success",
      });
      return;
    }

    if (result?.status === "payment_error") {
      addToast({
        title: t("payments.send.paymentError"),
        description: getPaymentErrorDescription(t, result.error),
        variant: "solid",
        color: "danger",
      });
    }
  };

  return (
    <>
      <PaymentForm
        invoiceValidationError={invoiceValidationError}
        isLoading={isLoading}
        payInvoice={payInvoice}
        onInvoiceChange={actions.updateInvoice}
        onSubmit={handleOpenConfirm}
      />

      <PaymentConfirmModal
        decodedInvoice={decodedInvoice}
        isOpen={isConfirmOpen}
        onClose={actions.closeConfirm}
        onConfirm={handleConfirmPayment}
        paymentResult={paymentResult}
        isLoading={isLoading}
      />
    </>
  );
}
