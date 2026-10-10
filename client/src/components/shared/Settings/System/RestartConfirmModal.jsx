"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

export function RestartConfirmModal({ isOpen, title, description, isRestarting, onCancel, onConfirm, systemCardTranslations }) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onCancel} isDismissable={!isRestarting} hideCloseButton={isRestarting}>
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <div className="flex items-start gap-3 border border-red-400 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <p className="text-red-700 text-sm">{description}</p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={onCancel}
            isDisabled={isRestarting}
          >
            {systemCardTranslations("cardSystem.cancelButton")}
          </Button>
          <Button color="danger" onPress={onConfirm} isLoading={isRestarting}>
            {systemCardTranslations("cardSystem.confirmButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
