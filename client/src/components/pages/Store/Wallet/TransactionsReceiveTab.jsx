"use client";

import { useState } from "react";

import { addToast, Button, Input, NumberInput, Spinner } from "@heroui/react";
import { Bitcoin, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

import { createInvoice } from "@modules/cashier/cashierService";

export function TransactionsReceiveTab({ loading, setLoading, setError, invoiceActions }) {
  const t = useTranslations("wallet");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [invalidNumberInput, setInvalidNumberInput] = useState(false);

  const handleCreateInvoice = async () => {
    if (invoiceAmount < 1 || !invoiceAmount) {
      setInvalidNumberInput(true);
      return;
    }
    try {
      setLoading(true);
      const res = await createInvoice(invoiceAmount, invoiceDesc);
      invoiceActions.createInvoice(res);
      setInvoiceAmount("");
      setInvoiceDesc("");
      setError("");
      addToast({
        title: t("payments.receive.invoiceSuccessTitle"),
        description: t("payments.receive.invoiceSuccessDescription"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      setError(t("payments.receive.invoiceCreateError"));
      addToast({
        title: "Error",
        description: t("payments.receive.invoiceCreateError"),
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
        <NumberInput
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
              "border-green-600",
            ],
          }}
          label={t("payments.receive.invoiceAmountLabel")}
          placeholder="1000"
          minValue={0}
          value={invoiceAmount}
          onValueChange={(value) => {
            setInvoiceAmount(value === null ? "" : value);
            setInvalidNumberInput(false);
          }}
          startContent={<Bitcoin className="w-5 h-5 text-gray-400 pb-0.5" />}
          disabled={loading}
          isInvalid={invalidNumberInput}
          errorMessage={invalidNumberInput ? t("payments.receive.invoiceAmountError") : ""}
        />
        <Input
          label={t("payments.receive.invoiceDescriptionLabel")}
          placeholder={t("payments.receive.invoiceDescriptionPlaceholder")}
          value={invoiceDesc}
          onChange={(e) => setInvoiceDesc(e.target.value)}
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
              "border-green-600",
            ],
          }}
          disabled={loading}
        />
        <Button
          onPress={handleCreateInvoice}
          variant="solid"
          color="primary"
          size="lg"
          disabled={loading}
          className="w-full gradient-forest text-white"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <Spinner size="sm" color="white" />
              <span>{t("payments.receive.invoiceLightningLoading")}</span>
            </div>
          ) : (
            <>
              <QrCode className="w-4 h-4 mr-2" />
              {t("payments.receive.invoiceLightningButton")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
