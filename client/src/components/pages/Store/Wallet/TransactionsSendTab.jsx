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
  Spinner,
} from "@heroui/react";
import { CheckCircle, Copy, Send, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { payInvoiceFromService } from "@modules/cashier/cashierService";

import { copyToClipboard, formatSats } from "./utils/formatters";

export function TransactionsSendTab({ loading, setLoading, setError }) {
  const t = useTranslations("wallet");
  const [payInvoice, setPayInvoice] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [invalidInvoice, setInvalidInvoice] = useState(false);

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
      setError(validation.error);
      return;
    }

    try {
      setLoading(true);
      const res = await payInvoiceFromService(payInvoice);
      setPaymentResult(res);
      setPayInvoice("");
      setError("");
      setInvalidInvoice(false);
      addToast({
        title: t("payments.send.paySuccessTitle"),
        description: t("payments.send.paySuccessDescription"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      setError(t("payments.send.paymentError"));
      addToast({
        title: "Error",
        description: t("payments.send.paymentErrorDescription"),
        variant: "solid",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <Input
          classNames={{
            label: "text-sm font-semibold text-deep",
            input: "text-base bg-white",
            innerWrapper: "bg-white",
            inputWrapper: [
              "bg-white",
              "hover:!bg-white",
              "group-data-[hover=true]:!bg-white",
              "group-data-[focus=true]:bg-white",
              "border-1",
              "border-yellow-400",
            ],
          }}
          label={t("payments.send.payInvoiceLabel")}
          placeholder="lnbc1..."
          value={payInvoice}
          onChange={(e) => {
            setPayInvoice(e.target.value);
            setInvalidInvoice(false);
            setError("");
          }}
          startContent={<Zap className="w-5 h-5 text-gray-400" />}
          disabled={loading}
          isInvalid={invalidInvoice}
          errorMessage={invalidInvoice ? t("payments.send.invalidInvoiceFormat") : ""}
        />
        <Button
          onPress={handlePayInvoice}
          variant="solid"
          color="warning"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <Spinner size="sm" color="white" />
              <span>{t("payments.send.payLightningLoading")}</span>
            </div>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {t("payments.send.payLightningButton")}
            </>
          )}
        </Button>
      </div>

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
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => copyToClipboard(paymentResult.paymentHash, t)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {t("payments.send.copyButton")}
                  </Button>
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
