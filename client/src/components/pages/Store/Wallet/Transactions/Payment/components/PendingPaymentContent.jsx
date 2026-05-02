"use client";

import { useCallback } from "react";

import {
  Button,
  Divider,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

import { formatSats } from "../../../utils/formatters";
import { usePaymentAmountInput } from "../hooks/usePaymentAmountInput";
import { formatFiat as formatFiatValue } from "../utils/formatFiat";

import { ZeroAmountPaymentFields } from "./ZeroAmountPaymentFields";

export function PendingPaymentContent({
  decodedInvoice,
  isLoading,
  isOpen,
  onClose,
  onConfirm,
}) {
  const t = useTranslations("wallet");
  const { currency } = useCurrency();
  const invoiceSats = decodedInvoice?.amountSat;
  const description = decodedInvoice?.description;
  const isZeroAmount = invoiceSats == null;
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
    handleAmountChange,
    handleAmountModeChange,
    getConfirmAmount,
    isConfirmDisabled,
  } = usePaymentAmountInput({
    isOpen,
    isPaid: false,
    invoiceSats,
    currencyAcronym: currency.acronym,
    t,
  });

  const handleConfirm = useCallback(() => {
    const confirmAmount = getConfirmAmount();
    if (confirmAmount === undefined) return;
    onConfirm(confirmAmount);
  }, [getConfirmAmount, onConfirm]);

  const formatFiat = useCallback(
    (value) => formatFiatValue({
      value,
      currencyAcronym: currency.acronym,
      locale: currency.locale,
    }),
    [currency],
  );

  return (
    <>
      <ModalBody className="gap-0">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Send className="h-16 w-16 text-forest" />
          <p className="text-xl font-semibold text-deep">
            {t("payments.send.confirmModal.summaryTitle")}
          </p>
        </div>

        <div className="space-y-3">
          {isZeroAmount ? (
            <ZeroAmountPaymentFields
              amountInputMode={amountInputMode}
              currencyAcronym={currency.acronym}
              customEstimateError={customEstimateError}
              customEstimateValue={customEstimateValue}
              estimatedSats={estimatedSats}
              fiatToSatHasError={fiatToSatHasError}
              fiatToSatIsLoading={fiatToSatIsLoading}
              onAmountChange={handleAmountChange}
              onAmountModeChange={handleAmountModeChange}
            />
          ) : (
            <div className="flex justify-between">
              <span className="text-gray-500">
                {t("payments.send.confirmModal.amountLabel")}
              </span>
              <span className="font-medium">
                {formatSats(invoiceSats)} sats
              </span>
            </div>
          )}

          {amountInputMode !== "fiat" && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                {t("payments.send.confirmModal.estimatedLabel")}
              </span>
              <span className="font-medium">
                {estimatedSats == null || estimatedSats <= 0
                  ? "-"
                  : (
                    <>
                      {estimatedFiatIsLoading && t("payments.send.confirmModal.fiatLoading")}
                      {estimatedFiatHasError && t("payments.send.confirmModal.fiatError")}
                      {!estimatedFiatIsLoading && !estimatedFiatHasError && estimatedFiat != null && formatFiat(estimatedFiat)}
                    </>
                    )}
              </span>
            </div>
          )}
        </div>

        {description && (
          <>
            <Divider />
            <div className="space-y-2 pt-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("payments.send.confirmModal.descriptionLabel")}
                  </span>
                  <span className="font-medium text-right max-w-[60%]">
                    {description}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter className="justify-between">
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
          onPress={onClose}
          isDisabled={isLoading}
        >
          {t("payments.send.confirmModal.cancelButton")}
        </Button>
        <Button
          color="primary"
          onPress={handleConfirm}
          isLoading={isLoading}
          isDisabled={isConfirmDisabled}
        >
          {t("payments.send.confirmModal.confirmButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
