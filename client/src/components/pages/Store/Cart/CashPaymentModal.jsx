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
  Chip,
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
  const t = useTranslations("cart.paymentModal.cash");
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
      setError(t("errors.insufficient"));
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
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col">
          {t("title")}
          <span className="text-sm text-gray-600">
            {t("subtitle")}
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="border-b pb-3 mb-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{t("totalLabel")}</p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-semibold text-green-900">
                {formattedTotal}
              </p>
              <Chip
                className="bg-green-200 text-xs text-green-800 border border-green-300"
              >
                {t("cash")}
              </Chip>
            </div>
          </div>

          <NumberInput
            label={t("receivedLabel")}
            value={cashReceived}
            onValueChange={(value) => {
              setCashReceived(value);
              setError("");
            }}
            minValue={0}
            step={0.10}
            size="lg"
            startContent={
              <span className="text-default-400 text-small">$</span>
            }
          />

          <div className="bg-white rounded-xl border border-gray-400 p-3 flex justify-between items-center shadow-sm">
            <span className="text-sm text-gray-600">{t("changeLabel")}</span>
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
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            className="bg-green-800"
            isDisabled={cashReceived <= 0}
            onPress={handleConfirm}
          >
            {t("confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
