"use client";
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
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
  const t = useTranslations("cart.paymentModal.card");
  const { formatAmount } = useCurrency();
  const formattedTotal = displayTotal || formatAmount((amountDue || 0) * 100);
  const resolvedMethodLabel = methodLabel || t("defaultMethod");

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
              <Chip className="bg-green-200 text-xs text-green-800 border border-green-300">
                {resolvedMethodLabel}
              </Chip>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-400 p-3 flex justify-between items-center shadow-sm">
            <span className="text-sm text-gray-600">{t("methodLabel")}</span>
            <span className="text-lg font-semibold text-green-700">{resolvedMethodLabel}</span>
          </div>
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
            onPress={() => onComplete?.()}
          >
            {t("confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
