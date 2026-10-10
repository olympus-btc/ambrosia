"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

export function DeleteProductsModal({ product, deleteProductsShowModal, setDeleteProductsShowModal, onConfirm }) {
  const productTranslations = useTranslations("products");
  return (
    <Modal
      isOpen={deleteProductsShowModal}
      onOpenChange={setDeleteProductsShowModal}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
      placement="center"
    >
      <ModalContent>
        <ModalHeader>{productTranslations("modal.titleDelete")}</ModalHeader>
        <ModalBody>
          <p>{productTranslations("modal.subtitleDelete")}<b> {product?.name}</b>?</p>
          <p className="text-red-500 text-sm">{productTranslations("modal.warningDelete")}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={() => setDeleteProductsShowModal(false)}
          >
            {productTranslations("modal.cancelButton")}
          </Button>
          <Button color="danger" onPress={onConfirm}>
            {productTranslations("modal.deleteButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
