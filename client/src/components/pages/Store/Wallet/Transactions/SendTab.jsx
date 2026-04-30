"use client";

import { useState } from "react";

import { addToast, Button, Input } from "@heroui/react";
import { useTranslations } from "next-intl";

import { getPaymentErrorDescription } from "@/components/pages/Store/Wallet/utils/paymentErrors";
import { payInvoiceFromService } from "@/services/walletService";

import { PaymentSentModal } from "./PaymentSentModal";

export function SendTab({ fetchInfo, fetchTransactions }) {
  const t = useTranslations("wallet");
  const [payInvoice, setPayInvoice] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [invoiceValidationError, setInvoiceValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getBolt11ValidationError = (invoiceValue) => {
    if (!invoiceValue || !invoiceValue.trim()) {
      return t("payments.send.noInvoiceToPay");
    }

    const trimmedInvoice = invoiceValue.trim().toLowerCase();
    const validPrefixes = ["lnbc", "lntb", "lnbcrt"];
    const hasValidPrefix = validPrefixes.some((prefix) => trimmedInvoice.startsWith(prefix));

    if (!hasValidPrefix) {
      return t("payments.send.invalidInvoiceFormat");
    }

    if (trimmedInvoice.length < 20) {
      return t("payments.send.invalidInvoiceFormat");
    }

    return "";
  };

  const handlePayInvoice = async () => {
    const validationError = getBolt11ValidationError(payInvoice);

    if (validationError) {
      setInvoiceValidationError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      const paymentResponse = await payInvoiceFromService(payInvoice);
      setPaymentResult(paymentResponse);
      setPayInvoice("");
      setInvoiceValidationError("");
      fetchInfo?.();
      fetchTransactions?.();
      addToast({
        title: t("payments.send.paySuccessTitle"),
        description: t("payments.send.paySuccessDescription"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      if (err?.code) {
        console.warn(err);
      } else {
        console.error(err);
      }
      addToast({
        title: t("payments.send.paymentError"),
        description: getPaymentErrorDescription(t, err),
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Input
        label={t("payments.send.payInvoiceLabel")}
        placeholder="lnbc1..."
        value={payInvoice}
        onChange={(e) => {
          setPayInvoice(e.target.value);
          setInvoiceValidationError("");
        }}
        isDisabled={isLoading}
        isInvalid={Boolean(invoiceValidationError)}
        errorMessage={invoiceValidationError}
      />
      <Button
        onPress={handlePayInvoice}
        color="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        {isLoading ? t("payments.send.payLightningLoading") : t("payments.send.payLightningButton")}
      </Button>

      <PaymentSentModal
        result={paymentResult}
        onClose={() => setPaymentResult(null)}
      />
    </div>
  );
}
