"use client";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";

import { SummaryContent } from "./SummaryContent";

export function SummaryModal({ isOpen, onClose, ...props }) {
  const cartTranslations = useTranslations("cart");
  const { onClearCart } = props;

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
        <ModalHeader><div className="flex w-full items-center justify-between">
          <h2 className="text-lg font-semibold text-green-900">
            {cartTranslations("summary.title")}
          </h2>
          <DeleteButton onPress={onClearCart} showLabelOnMobile>
            {cartTranslations("summary.clearCart")}
          </DeleteButton>
        </div></ModalHeader>
        <ModalBody>
          <SummaryContent {...props} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
