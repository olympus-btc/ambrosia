"use client";

import { useState } from "react";

import { addToast, Button, Input } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { createInvoice } from "@/services/walletService";

import { AmountUnitInputFields } from "./AmountUnitInputFields";
import { useWalletAmountInput } from "./hooks/useWalletAmountInput";

export function ReceiveTab({ invoiceActions, currentRate }) {
  const walletTranslations = useTranslations("wallet");
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
    invalidAmountMessage: walletTranslations("payments.receive.invoiceAmountError"),
    amountTooLargeMessage: walletTranslations("payments.receive.invoiceAmountTooLargeError"),
  });

  const handleCreateInvoice = async () => {
    const amountSat = getConfirmAmount();
    if (amountSat === undefined) {
      return;
    }
    const fiatAmount = amountSat != null && currentRate != null
      ? (amountSat / 100_000_000) * currentRate
      : null;
    try {
      setIsLoading(true);
      const res = await createInvoice({
        amountSat,
        description: invoiceDesc,
        exchangeRate: currentRate ?? null,
        exchangeRateCurrency: currentRate != null ? (currency?.acronym?.toLowerCase() ?? null) : null,
        fiatAmount,
      });
      invoiceActions.createInvoice(res);
      resetAmounts();
      setInvoiceDesc("");
      addToast({
        title: walletTranslations("payments.receive.invoiceSuccessTitle"),
        description: walletTranslations("payments.receive.invoiceSuccessDescription"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: walletTranslations("errorTitle"),
        description: walletTranslations("payments.receive.invoiceCreateError"),
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fieldLabels = {
    title: walletTranslations("payments.receive.invoiceAmountTitle"),
    satLabel: walletTranslations("payments.receive.invoiceAmountSatLabel"),
    satsOptionLabel: walletTranslations("payments.receive.satsOption"),
    satPlaceholder: walletTranslations("payments.receive.invoiceAmountSatPlaceholder"),
    fiatLabel: walletTranslations("payments.receive.invoiceAmountFiatLabel", { currency: currency.acronym }),
    fiatOptionLabel: walletTranslations("payments.receive.fiatOption", { currency: currency.acronym }),
    fiatPlaceholder: walletTranslations("payments.receive.invoiceAmountFiatPlaceholder"),
    estimatedLabel: walletTranslations("payments.receive.invoiceEstimatedLabel"),
    loadingText: walletTranslations("payments.receive.invoiceFiatLoading"),
    estimatedFiatErrorText: walletTranslations("payments.receive.invoiceSatsToFiatError"),
    conversionErrorText: walletTranslations("payments.receive.invoiceFiatToSatsError"),
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div id="wallet-receive-amount" className="mx-auto w-full max-w-xl">
          <AmountUnitInputFields
            labels={fieldLabels}
            amountState={{ amountInputMode, inputValue: customEstimateValue, onAmountChange: handleAmountChange, onAmountModeChange: handleAmountModeChange }}
            conversionState={{ estimatedFiat, estimatedFiatHasError, estimatedFiatIsLoading, estimatedSats, fiatToSatHasError, fiatToSatIsLoading }}
            errorMessage={customEstimateError}
            isDisabled={isLoading}
          />
        </div>
        <div id="wallet-receive-description" className="mx-auto w-full max-w-xl">
          <Input
            label={walletTranslations("payments.receive.invoiceDescriptionLabel")}
            placeholder={walletTranslations("payments.receive.invoiceDescriptionPlaceholder")}
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
            {isLoading ? walletTranslations("payments.receive.invoiceLightningLoading") : walletTranslations("payments.receive.invoiceLightningButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
