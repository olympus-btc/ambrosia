"use client";

import { OverwriteConfirmModal } from "./OverwriteConfirmModal";

export function ImportBackupConfirmModal({ isOpen, onOpenChange, onConfirm, importDataTranslations }) {
  return (
    <OverwriteConfirmModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={importDataTranslations("cardImportData.confirmModal.title")}
      description={importDataTranslations("cardImportData.confirmModal.description")}
      warning={importDataTranslations("cardImportData.confirmModal.warning")}
      cancelText={importDataTranslations("cardImportData.confirmModal.cancelButton")}
      confirmText={importDataTranslations("cardImportData.confirmModal.confirmButton")}
    />
  );
}
