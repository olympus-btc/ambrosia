"use client";
import { useState, useMemo } from "react";

import {
  Button,
  NumberInput,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function CashPaymentModal({
  isOpen,
  onClose,
  onComplete,
  amountDue = 0,
  displayTotal,
}) {
  const cashTranslations = useTranslations("cart.paymentModal.cash");
  const { formatAmount } = useCurrency();
  const [cashReceived, setCashReceived] = useState(0);
  const [error, setError] = useState("");
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCashReceived(0);
      setError("");
    }
  }

  const numericReceived = cashReceived || 0;

  const change = useMemo(() => numericReceived - (amountDue || 0), [numericReceived, amountDue]);
  const hasEnoughCash = change >= 0;
  const formattedTotal = displayTotal || formatAmount((amountDue || 0) * 100);
  const formattedChange = Number.isFinite(change) ? formatAmount(change * 100) : change;

  const handleConfirm = () => {
    if (!hasEnoughCash) {
      setError(cashTranslations("errors.insufficient"));
      return;
    }
    onComplete?.({
      cashReceived: numericReceived,
      change,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col">
          {cashTranslations("title")}
          <span className="text-sm text-gray-600">
            {cashTranslations("subtitle")}
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="border-b pb-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{cashTranslations("totalLabel")}</p>
            <p className="text-xl font-semibold text-green-900">
              {formattedTotal}
            </p>
          </div>

          <NumberInput
            label={cashTranslations("receivedLabel")}
            value={cashReceived}
            onValueChange={(receivedAmount) => {
              setCashReceived(receivedAmount ?? 0);
              setError("");
            }}
            onChange={(e) => {
              if (e?.target) {
                const parsedAmount = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                setCashReceived(Math.min(parsedAmount, 9999999));
                setError("");
              }
            }}
            onKeyDown={(e) => {
              if (!/^[0-9]$/.test(e.key)) return;
              const currentInputText = (e.target.value || "").replace(/[^0-9.]/g, "");
              if (parseFloat(currentInputText + e.key) > 9999999) {
                e.preventDefault();
              }
            }}
            minValue={0}
            maxValue={9999999}
            formatOptions={{
              useGrouping: true,
              maximumFractionDigits: 2,
            }}

            step={0.01}
            size="lg"
            classNames={{ inputWrapper: "shadow-none" }}
            startContent={
              <span className="text-default-400 text-small">$</span>
            }
          />

          <div className="bg-white rounded-lg border p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">{cashTranslations("changeLabel")}</span>
            <span className={`text-lg font-semibold ${hasEnoughCash ? "text-green-700" : "text-red-600"}`}>
              {formattedChange}
            </span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={onClose}
          >
            {cashTranslations("cancel")}
          </Button>
          <Button
            color="primary"
            className="bg-green-800"
            isDisabled={cashReceived <= 0}
            onPress={handleConfirm}
          >
            {cashTranslations("confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
