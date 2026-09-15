"use client";
import { useState } from "react";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function TransferPaymentModal({
  isOpen,
  onClose,
  onComplete,
  amountDue = 0,
  displayTotal,
  methodLabel,
}) {
  const transferTranslations = useTranslations("cart.paymentModal.transfer");
  const { formatAmount } = useCurrency();
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousIsOpen, setPreviousIsOpen] = useState(isOpen);

  if (isOpen !== previousIsOpen) {
    setPreviousIsOpen(isOpen);
    if (isOpen) {
      setReference("");
      setIsSubmitting(false);
    }
  }

  const formattedTotal = displayTotal || formatAmount((amountDue || 0) * 100);
  const resolvedMethodLabel = methodLabel || transferTranslations("defaultMethod");

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onComplete?.({ reference: reference.trim() });
    } finally {
      setIsSubmitting(false);
    }
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
          {transferTranslations("title")}
          <span className="text-sm text-gray-600">
            {transferTranslations("subtitle")}
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="border-b pb-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{transferTranslations("totalLabel")}</p>
            <p className="text-xl font-semibold text-green-900">
              {formattedTotal}
            </p>
          </div>

          <div className="bg-white rounded-lg border p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">{transferTranslations("methodLabel")}</span>
            <span className="text-lg font-semibold text-green-700">{resolvedMethodLabel}</span>
          </div>

          <Input
            label={transferTranslations("referenceLabel")}
            placeholder={transferTranslations("referencePlaceholder")}
            value={reference}
            onValueChange={setReference}
            classNames={{ inputWrapper: "shadow-none" }}
          />
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            isDisabled={isSubmitting}
            onPress={onClose}
          >
            {transferTranslations("cancel")}
          </Button>
          <Button
            color="primary"
            className="bg-green-800"
            isDisabled={isSubmitting}
            onPress={handleConfirm}
          >
            {isSubmitting ? <Spinner color="white" size="sm" /> : transferTranslations("confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
