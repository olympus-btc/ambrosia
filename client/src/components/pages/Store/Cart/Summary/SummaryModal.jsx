"use client";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { SummaryContent } from "./SummaryContent";

export function SummaryModal({ isOpen, onClose, ...props }) {
  const t = useTranslations("cart");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      scrollBehavior="inside"
      size="lg"
      backdrop="blur"
      classNames={{ backdrop: "backdrop-blur-xs bg-white/10" }}
      className="md:hidden"
    >
      <ModalContent>
        <ModalHeader>{t("summary.title")}</ModalHeader>
        <ModalBody>
          <SummaryContent {...props} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
