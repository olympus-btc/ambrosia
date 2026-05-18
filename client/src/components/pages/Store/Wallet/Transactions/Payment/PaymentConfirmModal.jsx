"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { PaymentSuccessContent } from "./PaymentSuccessContent";
import { PendingPaymentContent } from "./PendingPaymentContent";

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
          <PendingPaymentContent
            key={`${isOpen}-${sessionKey}`}
            decodedInvoice={decodedInvoice}
            isLoading={isLoading}
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
