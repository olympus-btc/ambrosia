"use client";

import { useState } from "react";

import { addToast, Button, Input, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { createInvoice } from "@/services/walletService";

export function ReceiveTab({ invoiceActions }) {
  const t = useTranslations("wallet");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [invalidNumberInput, setInvalidNumberInput] = useState(false);
  const [amountTooLarge, setAmountTooLarge] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateInvoice = async () => {
    if (invoiceAmount < 1 || !invoiceAmount) {
      setInvalidNumberInput(true);
      return;
    }
    if (!Number.isSafeInteger(invoiceAmount)) {
      setAmountTooLarge(true);
      return;
    }
    try {
      setIsLoading(true);
      const res = await createInvoice(invoiceAmount, invoiceDesc);
      invoiceActions.createInvoice(res);
      setInvoiceAmount("");
      setInvoiceDesc("");
      addToast({
        title: t("payments.receive.invoiceSuccessTitle"),
        description: t("payments.receive.invoiceSuccessDescription"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: "Error",
        description: t("payments.receive.invoiceCreateError"),
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div id="wallet-receive-amount">
        <NumberInput
          label={t("payments.receive.invoiceAmountLabel")}
          placeholder="1000"
          minValue={0}
          classNames={{ inputWrapper: "shadow-none" }}
          value={invoiceAmount}
          onValueChange={(value) => {
            setInvoiceAmount(value === null ? "" : value);
            setInvalidNumberInput(false);
            setAmountTooLarge(false);
          }}
          isDisabled={isLoading}
          isInvalid={invalidNumberInput || amountTooLarge}
          errorMessage={
            amountTooLarge
              ? t("payments.receive.invoiceAmountTooLargeError")
              : invalidNumberInput
                ? t("payments.receive.invoiceAmountError")
                : ""
          }
        />
      </div>
      <div id="wallet-receive-description">
        <Input
          label={t("payments.receive.invoiceDescriptionLabel")}
          placeholder={t("payments.receive.invoiceDescriptionPlaceholder")}
          value={invoiceDesc}
          onChange={(e) => setInvoiceDesc(e.target.value)}
          isDisabled={isLoading}
        />
      </div>
      <div id="wallet-receive-button">
        <Button
          onPress={handleCreateInvoice}
          color="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          {isLoading ? t("payments.receive.invoiceLightningLoading") : t("payments.receive.invoiceLightningButton")}
        </Button>
      </div>
    </div>
  );
}
