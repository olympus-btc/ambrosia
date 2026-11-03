"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { confirmPendingImport, importBackup } from "@/services/backupService";
import { restartAppAfterImport } from "@/utils/restartAppAfterImport";
import { RestartRequiredModal } from "@components/shared/RestartRequiredModal";

import { ImportDataCardLocked } from "./ImportDataCardLocked";
import { ImportDataCardUnlocked } from "./ImportDataCardUnlocked";

export function ImportData() {
  const importDataTranslations = useTranslations("settings");
  const [showAccess, setShowAccess] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  const handleImport = async (rolePassword, backupPassword, backupFile, onProgress) => {
    await importBackup(rolePassword, backupPassword, backupFile, onProgress);
    addToast({ color: "success", description: importDataTranslations("cardImportData.success") });

    await confirmPendingImport();
    setShowRestartModal(true);
  };

  return (
    <>
      {showAccess ? (
        <ImportDataCardUnlocked
          onImport={handleImport}
          onHide={() => setShowAccess(false)}
          importDataTranslations={importDataTranslations}
        />
      ) : (
        <ImportDataCardLocked
          onReveal={() => setShowAccess(true)}
          importDataTranslations={importDataTranslations}
        />
      )}
      <RestartRequiredModal
        isOpen={showRestartModal}
        onManualClose={() => setShowRestartModal(false)}
        onRestart={restartAppAfterImport}
      />
    </>
  );
}
