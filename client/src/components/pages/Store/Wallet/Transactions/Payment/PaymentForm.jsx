"use client";

import { Button, Input } from "@heroui/react";
import { useTranslations } from "next-intl";

export function PaymentForm({
  invoiceValidationError,
  isLoading,
  payInvoice,
  onInvoiceChange,
  onSubmit,
}) {
  const t = useTranslations("wallet");

  return (
    <div className="p-6 space-y-4">
      <Input
        label={t("payments.send.payInvoiceLabel")}
        placeholder="lnbc1..."
        value={payInvoice}
        onChange={(event) => onInvoiceChange(event.target.value)}
        isDisabled={isLoading}
        isInvalid={Boolean(invoiceValidationError)}
        errorMessage={invoiceValidationError}
      />
      <Button
        onPress={onSubmit}
        color="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        {isLoading ? t("payments.send.payLightningLoading") : t("payments.send.payLightningButton")}
      </Button>
    </div>
  );
}
