"use client";

import { useState } from "react";

import {
  addToast,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
} from "@heroui/react";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/shared/CopyButton";
import { payInvoiceFromService } from "@/services/walletService";

import { formatSats } from "../utils/formatters";

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

      {paymentResult && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-800">
                {t("payments.send.paymentDone")}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-green-700">
                  {t("payments.send.amountSent")}
                </span>
                <span className="font-medium">
                  {formatSats(paymentResult.recipientAmountSat)} sats
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">
                  {t("payments.send.routingFee")}
                </span>
                <span className="font-medium">
                  {formatSats(paymentResult.routingFeeSat)} sats
                </span>
              </div>
              <Divider />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">
                    {t("payments.send.paymentHash")}
                  </span>
                  <CopyButton
                    value={paymentResult.paymentHash}
                    label={t("payments.send.copyButton")}
                    size="sm"
                  />
                </div>
                <div className="bg-white p-2 rounded text-xs break-all">
                  {paymentResult.paymentHash}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
