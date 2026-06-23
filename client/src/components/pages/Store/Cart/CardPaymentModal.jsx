"use client";
import { useState } from "react";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function CardPaymentModal({
  isOpen,
  onClose,
  onComplete,
  amountDue = 0,
  displayTotal,
  methodLabel,
}) {
  const cardTranslations = useTranslations("cart.paymentModal.card");
  const { formatAmount } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousIsOpen, setPreviousIsOpen] = useState(isOpen);

  if (isOpen !== previousIsOpen) {
    setPreviousIsOpen(isOpen);
    if (isOpen) {
      setIsSubmitting(false);
    }
  }

  const formattedTotal = displayTotal || formatAmount((amountDue || 0) * 100);
  const resolvedMethodLabel = methodLabel || cardTranslations("defaultMethod");

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onComplete?.();
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
          {cardTranslations("title")}
          <span className="text-sm text-gray-600">
            {cardTranslations("subtitle")}
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="border-b pb-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{cardTranslations("totalLabel")}</p>
            <p className="text-xl font-semibold text-green-900">
              {formattedTotal}
            </p>
          </div>

          <div className="bg-white rounded-lg border p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">{cardTranslations("methodLabel")}</span>
            <span className="text-lg font-semibold text-green-700">{resolvedMethodLabel}</span>
          </div>
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            isDisabled={isSubmitting}
            onPress={onClose}
          >
            {cardTranslations("cancel")}
          </Button>
          <Button
            color="primary"
            className="bg-green-800"
            isDisabled={isSubmitting}
            onPress={handleConfirm}
          >
            {isSubmitting ? <Spinner color="white" size="sm" /> : cardTranslations("confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
