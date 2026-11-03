"use client";

import { useState } from "react";

import { Button, Progress, Spinner, addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { restartAppAfterImport } from "@/utils/restartAppAfterImport";
import { BackupPasswordAndFileFields } from "@components/shared/BackupPasswordAndFileFields";
import { RestartRequiredModal } from "@components/shared/RestartRequiredModal";
import { confirmPendingRestore, restoreFromBackup } from "@services/initialSetupService";

function restorePhaseLabel(restoreTranslations, phase) {
  if (phase === "uploading") return restoreTranslations("restore.phaseUploading");
  if (phase === "extracting") return restoreTranslations("restore.phaseExtracting");
  return restoreTranslations("restore.restoring");
}

export function RestoreFromBackupStep({ onBack }) {
  const restoreTranslations = useTranslations();
  const [backupPassword, setBackupPassword] = useState("");
  const [backupFile, setBackupFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showRestartModal, setShowRestartModal] = useState(false);

  const handleSubmit = async () => {
    if (!backupPassword || !backupFile) {
      setErrorMessage(restoreTranslations("restore.missingFields"));
      return;
    }

    setIsSubmitting(true);
    setRestoreProgress(null);
    setErrorMessage("");
    try {
      const restoreResponse = await restoreFromBackup(backupPassword, backupFile, setRestoreProgress);
      if (!restoreResponse.ok) {
        setErrorMessage(
          restoreResponse.status === 409
            ? restoreTranslations("restore.pendingRestoreError")
            : restoreTranslations("restore.genericError"),
        );
        return;
      }

      addToast({
        title: restoreTranslations("restore.successTitle"),
        description: restoreTranslations("restore.successDescription"),
        color: "success",
      });

      await confirmPendingRestore();
      setShowRestartModal(true);
    } catch {
      setErrorMessage(restoreTranslations("restore.genericError"));
      setRestoreProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{restoreTranslations("restore.title")}</h2>
      <p className="text-gray-500 mb-4 md:mb-8">{restoreTranslations("restore.subtitle")}</p>

      <div className="flex flex-col gap-4">
        {isSubmitting ? (
          <div className="flex flex-col items-center gap-2 py-6 w-full">
            {restoreProgress?.percent != null ? (
              <>
                <Progress
                  aria-label={restoreTranslations("restore.restoring")}
                  value={restoreProgress.percent}
                  className="max-w-full"
                  color="success"
                  size="sm"
                />
                <p className="text-sm text-gray-500">
                  {restorePhaseLabel(restoreTranslations, restoreProgress.phase)} {restoreProgress.percent}%
                </p>
              </>
            ) : (
              <>
                <Spinner size="lg" color="success" />
                <p className="text-sm text-gray-500">
                  {restoreProgress ? restorePhaseLabel(restoreTranslations, restoreProgress.phase) : restoreTranslations("restore.restoring")}
                </p>
              </>
            )}
          </div>
        ) : (
          <BackupPasswordAndFileFields
            backupPassword={backupPassword}
            onBackupPasswordChange={setBackupPassword}
            onFileChange={setBackupFile}
          />
        )}

        {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
      </div>

      <div className="flex justify-between mt-8">
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onPress={onBack}
          isDisabled={isSubmitting}
        >
          {restoreTranslations("buttons.back")}
        </Button>
        <Button
          color="primary"
          onPress={handleSubmit}
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
          className="bg-green-800"
        >
          {isSubmitting ? restoreTranslations("restore.submitting") : restoreTranslations("restore.submitButton")}
        </Button>
      </div>

      <RestartRequiredModal
        isOpen={showRestartModal}
        onManualClose={() => setShowRestartModal(false)}
        onRestart={restartAppAfterImport}
      />
    </div>
  );
}
