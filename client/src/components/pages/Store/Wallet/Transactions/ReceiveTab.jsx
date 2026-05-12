"use client";

import { useState } from "react";

import { addToast, Button, Input } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { createInvoice } from "@/services/walletService";

import { AmountUnitInputFields } from "./AmountUnitInputFields";
import { useWalletAmountInput } from "./hooks/useWalletAmountInput";

export function ReceiveTab({ invoiceActions }) {
  const t = useTranslations("wallet");
  const { currency } = useCurrency();
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    amountInputMode,
    customEstimateError,
    customEstimateValue,
    estimatedFiat,
    estimatedFiatHasError,
    estimatedFiatIsLoading,
    estimatedSats,
    fiatToSatHasError,
    fiatToSatIsLoading,
    getConfirmAmount,
    handleAmountChange,
    handleAmountModeChange,
    resetAmounts,
  } = useWalletAmountInput({
    isOpen: true,
    isPaid: false,
    invoiceSats: null,
    currencyAcronym: currency.acronym,
    invalidAmountMessage: t("payments.receive.invoiceAmountError"),
    amountTooLargeMessage: t("payments.receive.invoiceAmountTooLargeError"),
  });

  const handleCreateInvoice = async () => {
    const amountSat = getConfirmAmount();
    if (amountSat === undefined) {
      return;
    }
    try {
      setIsLoading(true);
      const res = await createInvoice({
        amountSat,
        description: invoiceDesc,
      });
      invoiceActions.createInvoice(res);
      resetAmounts();
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
        title: t("errorTitle"),
        description: t("payments.receive.invoiceCreateError"),
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div id="wallet-receive-amount" className="mx-auto w-full max-w-xl">
          <AmountUnitInputFields
            amountInputMode={amountInputMode}
            currencyAcronym={currency.acronym}
            currencyLocale={currency.locale}
            errorMessage={customEstimateError}
            estimatedFiat={estimatedFiat}
            estimatedFiatErrorText={t("payments.receive.invoiceSatsToFiatError")}
            estimatedFiatHasError={estimatedFiatHasError}
            estimatedFiatIsLoading={estimatedFiatIsLoading}
            estimatedLabel={t("payments.receive.invoiceEstimatedLabel")}
            estimatedSats={estimatedSats}
            fiatLabel={t("payments.receive.invoiceAmountFiatLabel", { currency: currency.acronym })}
            fiatOptionLabel={t("payments.receive.fiatOption", { currency: currency.acronym })}
            fiatPlaceholder={t("payments.receive.invoiceAmountFiatPlaceholder")}
            fiatToSatHasError={fiatToSatHasError}
            fiatToSatIsLoading={fiatToSatIsLoading}
            inputValue={customEstimateValue}
            isDisabled={isLoading}
            loadingText={t("payments.receive.invoiceFiatLoading")}
            onAmountChange={handleAmountChange}
            onAmountModeChange={handleAmountModeChange}
            satLabel={t("payments.receive.invoiceAmountSatLabel")}
            satsOptionLabel={t("payments.receive.satsOption")}
            satPlaceholder={t("payments.receive.invoiceAmountSatPlaceholder")}
            title={t("payments.receive.invoiceAmountTitle")}
            conversionErrorText={t("payments.receive.invoiceFiatToSatsError")}
          />
        </div>
        <div id="wallet-receive-description" className="mx-auto w-full max-w-xl">
          <Input
            label={t("payments.receive.invoiceDescriptionLabel")}
            placeholder={t("payments.receive.invoiceDescriptionPlaceholder")}
            value={invoiceDesc}
            onChange={(e) => setInvoiceDesc(e.target.value)}
            isDisabled={isLoading}
            classNames={{
              inputWrapper: "border border-default-200 bg-white shadow-none",
            }}
          />
        </div>
        <div id="wallet-receive-button" className="mx-auto w-full max-w-xl">
          <Button
            onPress={handleCreateInvoice}
            color="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full font-medium"
            radius="lg"
          >
            {isLoading ? t("payments.receive.invoiceLightningLoading") : t("payments.receive.invoiceLightningButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
