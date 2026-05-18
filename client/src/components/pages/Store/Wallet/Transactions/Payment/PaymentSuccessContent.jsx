"use client";

import {
  Button,
  Divider,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useSatsToFiatEstimate } from "@/components/pages/Store/Wallet/Transactions/hooks/useSatsToFiatEstimate";
import { CopyButton } from "@/components/shared/CopyButton";

import { formatFiat, formatSats } from "../../utils/formatters";

export function PaymentSuccessContent({
  isOpen,
  onClose,
  result,
}) {
  const t = useTranslations("wallet");
  const { currency } = useCurrency();
  const {
    estimatedFiat,
    estimatedFiatHasError,
    estimatedFiatIsLoading,
  } = useSatsToFiatEstimate({
    isActive: isOpen,
    isPaid: false,
    satsAmount: result?.recipientAmountSat,
    currencyAcronym: currency.acronym,
  });

  return (
    <>
      <ModalBody className="gap-0">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <CheckCircle className="h-16 w-16 text-forest" />
          <p className="text-xl font-semibold text-deep">
            {t("payments.send.paySuccessTitle")}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("payments.send.amountSent")}</span>
            <span className="font-medium">{formatSats(result?.recipientAmountSat)} sats</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("payments.send.estimatedLabel")}</span>
            <span className="font-medium">
              {estimatedFiatIsLoading && t("payments.send.confirmModal.fiatLoading")}
              {estimatedFiatHasError && t("payments.send.confirmModal.fiatError")}
              {!estimatedFiatIsLoading && !estimatedFiatHasError && estimatedFiat != null && formatFiat({
                value: estimatedFiat,
                currencyAcronym: currency.acronym,
                locale: currency.locale,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("payments.send.routingFee")}</span>
            <span className="font-medium">{formatSats(result?.routingFeeSat)} sats</span>
          </div>
        </div>

        <Divider className="mt-4" />

        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">{t("payments.send.paymentPreImage")}</span>
            <CopyButton
              value={result?.paymentPreimage ?? ""}
              label={t("payments.send.copyButton")}
              size="sm"
            />
          </div>
          <div className="bg-gray-100 rounded p-2 text-xs font-mono truncate sm:whitespace-normal sm:break-all">
            {result?.paymentPreimage}
          </div>
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">{t("payments.send.paymentHash")}</span>
            <CopyButton
              value={result?.paymentHash ?? ""}
              label={t("payments.send.copyButton")}
              size="sm"
            />
          </div>
          <div className="bg-gray-100 rounded p-2 text-xs font-mono truncate sm:whitespace-normal sm:break-all">
            {result?.paymentHash}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
          onPress={onClose}
        >
          {t("payments.send.closeButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
