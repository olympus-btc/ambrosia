"use client";

import { useRef, useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

export function DeleteCategoriesModal({ category, deleteCategoriesShowModal, setDeleteCategoriesShowModal, onConfirm }) {
  const categoryTranslations = useTranslations("categories");
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const handleConfirmDeleteCategory = async () => {
    if (isDeletingRef.current) return;

    isDeletingRef.current = true;
    try {
      setIsDeleting(true);
      await onConfirm?.();
    } catch {
      return;
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={deleteCategoriesShowModal}
      onOpenChange={setDeleteCategoriesShowModal}
      placement="center"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{categoryTranslations("modal.titleDelete")}</ModalHeader>
        <ModalBody>
          <p>{categoryTranslations("modal.subtitleDelete")}<b> {category?.name}</b>?</p>
          <p className="text-red-500 text-sm">{categoryTranslations("modal.warningDelete")}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={() => setDeleteCategoriesShowModal(false)}
            isDisabled={isDeleting}
          >
            {categoryTranslations("modal.cancelButton")}
          </Button>
          <Button
            color="danger"
            onPress={handleConfirmDeleteCategory}
            isDisabled={isDeleting}
            isLoading={isDeleting}
          >
            {categoryTranslations("modal.deleteButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
