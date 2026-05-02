"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { PaymentSuccessContent } from "./Payment";

export function PaymentSentModal({ result, onClose }) {
  const t = useTranslations("wallet");

  return (
    <Modal
      isOpen={Boolean(result)}
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
        <ModalHeader>{t("payments.send.paymentDone")}</ModalHeader>
        <PaymentSuccessContent
          isOpen={Boolean(result)}
          onClose={onClose}
          result={result}
        />
      </ModalContent>
    </Modal>
  );
}
