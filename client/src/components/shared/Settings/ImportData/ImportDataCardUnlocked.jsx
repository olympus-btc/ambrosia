"use client";

import { useState } from "react";

import { Button, Card, CardBody, CardHeader, Progress, Spinner } from "@heroui/react";

import WalletGuard from "@components/auth/WalletGuard";
import { BackupPasswordAndFileFields } from "@components/shared/BackupPasswordAndFileFields";

import { ImportBackupConfirmModal } from "./ImportBackupConfirmModal";

function importPhaseLabel(importDataTranslations, phase) {
  if (phase === "uploading") return importDataTranslations("cardImportData.phaseUploading");
  if (phase === "extracting") return importDataTranslations("cardImportData.phaseExtracting");
  return importDataTranslations("cardImportData.importing");
}

export function ImportDataCardUnlocked({ onImport, onHide, importDataTranslations }) {
  const [rolePassword, setRolePassword] = useState(null);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupFile, setBackupFile] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (file) => {
    setBackupFile(file);
    setErrorMessage("");
  };

  const handleContinue = () => {
    if (!backupPassword || !backupFile) {
      setErrorMessage(importDataTranslations("cardImportData.missingFields"));
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmImport = async () => {
    setIsConfirmModalOpen(false);
    setIsImporting(true);
    setImportProgress(null);
    setErrorMessage("");
    try {
      await onImport(rolePassword, backupPassword, backupFile, setImportProgress);
    } catch (importError) {
      setErrorMessage(
        importError.status === 409
          ? importDataTranslations("cardImportData.pendingImportError")
          : importDataTranslations("cardImportData.errorDescription"),
      );
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <WalletGuard
      onAuthorized={setRolePassword}
      onCancel={onHide}
      title={importDataTranslations("cardImportData.modalTitle")}
      passwordLabel={importDataTranslations("cardImportData.passwordLabel")}
      confirmText={importDataTranslations("cardImportData.confirmButton")}
      cancelText={importDataTranslations("cardImportData.cancelButton")}
    >
      <Card shadow="none" className="rounded-lg p-6 shadow-lg">
        <CardHeader className="flex flex-col items-start pb-0">
          <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
            {importDataTranslations("cardImportData.title")}
          </h2>
        </CardHeader>

        <CardBody>
          {isImporting ? (
            <div className="flex flex-col items-center gap-2 py-6 w-full">
              {importProgress?.percent != null ? (
                <>
                  <Progress
                    aria-label={importDataTranslations("cardImportData.importing")}
                    value={importProgress.percent}
                    className="max-w-full"
                    color="success"
                    size="sm"
                  />
                  <p className="text-sm text-gray-500">
                    {importPhaseLabel(importDataTranslations, importProgress.phase)} {importProgress.percent}%
                  </p>
                </>
              ) : (
                <>
                  <Spinner size="lg" color="success" />
                  <p className="text-sm text-gray-500">
                    {importProgress ? importPhaseLabel(importDataTranslations, importProgress.phase) : importDataTranslations("cardImportData.importing")}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <BackupPasswordAndFileFields
                backupPassword={backupPassword}
                onBackupPasswordChange={setBackupPassword}
                onFileChange={handleFileChange}
              />

              {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

              <Button
                color="primary"
                onPress={handleContinue}
                className="bg-green-800 self-start"
              >
                {importDataTranslations("cardImportData.continueButton")}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <ImportBackupConfirmModal
        isOpen={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        onConfirm={handleConfirmImport}
        importDataTranslations={importDataTranslations}
      />
    </WalletGuard>
  );
}
