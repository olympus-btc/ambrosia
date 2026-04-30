"use client";

import { useCallback } from "react";

import {
  Button,
  Divider,
  NumberInput,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

import { formatSats } from "../utils/formatters";

import { formatFiat as formatFiatValue } from "./formatFiat";
import { PaymentSuccessContent } from "./PaymentSuccessContent";
import { usePaymentAmountInput } from "./usePaymentAmountInput";

export function PaymentConfirmModal({
  decodedInvoice,
  isOpen,
  onClose,
  onConfirm,
  paymentResult,
  isLoading,
}) {
  const t = useTranslations("wallet");
  const isPaid = paymentResult != null;
  const invoiceSats = decodedInvoice?.amountSat;
  const description = decodedInvoice?.description;
  const sessionKey = decodedInvoice?.paymentRequest ?? decodedInvoice?.paymentHash ?? `${invoiceSats ?? "zero"}:${description ?? ""}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
      shouldBlockScroll={false}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader className="pb-2">
          {isPaid ? t("payments.send.paymentDone") : t("payments.send.confirmModal.title")}
        </ModalHeader>
        {isPaid ? (
          <PaymentSuccessContent
            isOpen={isOpen}
            result={paymentResult}
            onClose={onClose}
          />
        ) : (
          <PendingPaymentModalContent
            key={`${isOpen}-${sessionKey}`}
            decodedInvoice={decodedInvoice}
            isOpen={isOpen}
            isLoading={isLoading}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </ModalContent>
    </Modal>
  );
}

function PendingPaymentModalContent({
  decodedInvoice,
  isOpen,
  isLoading,
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
            <>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {t("payments.send.confirmModal.zeroAmountTitle")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={amountInputMode === "sat" ? "solid" : "bordered"}
                    color={amountInputMode === "sat" ? "primary" : "default"}
                    onPress={() => handleAmountModeChange("sat")}
                  >
                    {t("payments.send.confirmModal.satsOption")}
                  </Button>
                  <Button
                    variant={amountInputMode === "fiat" ? "solid" : "bordered"}
                    color={amountInputMode === "fiat" ? "primary" : "default"}
                    onPress={() => handleAmountModeChange("fiat")}
                  >
                    {t("payments.send.confirmModal.fiatOption", { currency: currency.acronym })}
                  </Button>
                </div>
              </div>

              <NumberInput
                type="number"
                label={amountInputMode === "fiat"
                  ? t("payments.send.confirmModal.zeroAmountFiatLabel", { currency: currency.acronym })
                  : t("payments.send.confirmModal.zeroAmountLabel")}
                placeholder={amountInputMode === "fiat"
                  ? t("payments.send.confirmModal.zeroAmountFiatPlaceholder")
                  : t("payments.send.confirmModal.zeroAmountPlaceholder")}
                value={customEstimateValue === "" ? null : Number(customEstimateValue)}
                onValueChange={handleAmountChange}
                onChange={(e) => handleAmountChange(e.target.value)}
                minValue={0}
                maxValue={amountInputMode === "fiat" ? Number.MAX_SAFE_INTEGER / 100 : Number.MAX_SAFE_INTEGER}
                formatOptions={{
                  useGrouping: false,
                  maximumFractionDigits: amountInputMode === "fiat" ? 2 : 0,
                }}
                isInvalid={Boolean(customEstimateError) || fiatToSatHasError}
                errorMessage={customEstimateError || (fiatToSatHasError
                  ? t("payments.send.confirmModal.fiatToSatsError")
                  : "")}
                step={amountInputMode === "fiat" ? "0.01" : "1"}
              />

              {amountInputMode === "fiat" && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("payments.send.confirmModal.estimatedLabel")}
                  </span>
                  <span className="font-medium">
                    {fiatToSatIsLoading && t("payments.send.confirmModal.fiatLoading")}
                    {fiatToSatHasError && t("payments.send.confirmModal.fiatToSatsError")}
                    {!fiatToSatIsLoading && !fiatToSatHasError && estimatedSats != null && `${formatSats(estimatedSats)} sats`}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-gray-500">
                {t("payments.send.confirmModal.estimatedLabel")}
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
      <ModalFooter>
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
