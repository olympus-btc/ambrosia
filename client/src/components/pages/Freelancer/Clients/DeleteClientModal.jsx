"use client";

import { useRef, useState } from "react";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

export function DeleteClientModal({ client, isOpen, onClose, onConfirm }) {
  const clientTranslations = useTranslations("freelanceClients");
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const handleConfirmDeleteClient = async () => {
    if (isDeletingRef.current) return;

    isDeletingRef.current = true;
    try {
      setIsDeleting(true);
      await onConfirm();
    } catch {
      return;
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextOpenState) => {
        if (!nextOpenState) onClose();
      }}
      placement="center"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{clientTranslations("modal.titleDelete")}</ModalHeader>
        <ModalBody>
          <p>{clientTranslations("modal.subtitleDelete")}<b> {client?.name}</b>?</p>
          <p className="text-red-500 text-sm">{clientTranslations("modal.warningDelete")}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={onClose}
            isDisabled={isDeleting}
          >
            {clientTranslations("modal.cancelButton")}
          </Button>
          <Button
            color="danger"
            onPress={handleConfirmDeleteClient}
            isDisabled={isDeleting}
            isLoading={isDeleting}
          >
            {clientTranslations("modal.deleteButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
