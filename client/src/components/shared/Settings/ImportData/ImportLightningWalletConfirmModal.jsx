"use client";

import { OverwriteConfirmModal } from "./OverwriteConfirmModal";

export function ImportLightningWalletConfirmModal({ isOpen, onOpenChange, onConfirm, importDataTranslations }) {
  return (
    <OverwriteConfirmModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={importDataTranslations("cardImportData.lightningWalletWarningModal.title")}
      description={importDataTranslations("cardImportData.lightningWalletWarningModal.description")}
      warning={importDataTranslations("cardImportData.lightningWalletWarningModal.warning")}
      cancelText={importDataTranslations("cardImportData.lightningWalletWarningModal.cancelButton")}
      confirmText={importDataTranslations("cardImportData.lightningWalletWarningModal.confirmButton")}
    />
  );
}
