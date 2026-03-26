"use client";

import { useState } from "react";

import { addToast, Button, Input } from "@heroui/react";
import { useTranslations } from "next-intl";

import { payInvoiceFromService } from "@/services/walletService";

import { PaymentSentModal } from "./PaymentSentModal";

export function SendTab({ fetchInfo, fetchTransactions }) {
  const t = useTranslations("wallet");
  const [payInvoice, setPayInvoice] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [invalidInvoice, setInvalidInvoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateBolt11 = (invoice) => {
    if (!invoice || !invoice.trim()) {
      return { valid: false, error: t("payments.send.noInvoiceToPay") };
    }

    const trimmed = invoice.trim().toLowerCase();
    const validPrefixes = ["lnbc", "lntb", "lnbcrt"];
    const hasValidPrefix = validPrefixes.some((prefix) => trimmed.startsWith(prefix));

    if (!hasValidPrefix) {
      return { valid: false, error: t("payments.send.invalidInvoiceFormat") };
    }

    if (trimmed.length < 20) {
      return { valid: false, error: t("payments.send.invalidInvoiceFormat") };
    }

    return { valid: true };
  };

  const handlePayInvoice = async () => {
    const validation = validateBolt11(payInvoice);

    if (!validation.valid) {
      setInvalidInvoice(true);
      return;
    }

    try {
      setIsLoading(true);
      const res = await payInvoiceFromService(payInvoice);
      setPaymentResult(res);
      setPayInvoice("");
      setInvalidInvoice(false);
      fetchInfo?.();
      fetchTransactions?.();
      addToast({
        title: t("payments.send.paySuccessTitle"),
        description: t("payments.send.paySuccessDescription"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: "Error",
        description: t("payments.send.paymentErrorDescription"),
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
          setInvalidInvoice(false);
        }}
        isDisabled={isLoading}
        isInvalid={invalidInvoice}
        errorMessage={invalidInvoice ? t("payments.send.invalidInvoiceFormat") : ""}
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
