"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

export function ImportBackupConfirmModal({ isOpen, onOpenChange, onConfirm, importDataTranslations }) {
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
        <ModalHeader>{importDataTranslations("cardImportData.confirmModal.title")}</ModalHeader>
        <ModalBody>
          <p>{importDataTranslations("cardImportData.confirmModal.description")}</p>
          <p className="text-red-500 text-sm">{importDataTranslations("cardImportData.confirmModal.warning")}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={() => onOpenChange(false)}
          >
            {importDataTranslations("cardImportData.confirmModal.cancelButton")}
          </Button>
          <Button color="danger" onPress={onConfirm}>
            {importDataTranslations("cardImportData.confirmModal.confirmButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
