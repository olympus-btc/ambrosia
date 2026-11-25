"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

export function OverwriteConfirmModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  warning,
  cancelText,
  confirmText,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p>{description}</p>
          <p className="text-red-500 text-sm">{warning}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button color="danger" onPress={onConfirm}>
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
