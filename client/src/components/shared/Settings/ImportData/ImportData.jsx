"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { confirmPendingImport, importBackup } from "@/services/backupService";
import { restartAppAfterImport } from "@/utils/restartAppAfterImport";
import { RestartRequiredModal } from "@components/shared/RestartRequiredModal";

import { ImportDataCardLocked } from "./ImportDataCardLocked";
import { ImportDataCardUnlocked } from "./ImportDataCardUnlocked";
import { ImportLightningWalletConfirmModal } from "./ImportLightningWalletConfirmModal";

export function ImportData() {
  const importDataTranslations = useTranslations("settings");
  const [showAccess, setShowAccess] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showLightningWalletWarningModal, setShowLightningWalletWarningModal] = useState(false);
  const [importedIncludesPhoenixdData, setImportedIncludesPhoenixdData] = useState(false);

  const finishImport = async () => {
    await confirmPendingImport();
    setShowRestartModal(true);
  };

  const handleImport = async (rolePassword, backupPassword, backupFile, onProgress) => {
    const importedManifest = await importBackup(rolePassword, backupPassword, backupFile, onProgress);
    addToast({ color: "success", description: importDataTranslations("cardImportData.success") });
    setImportedIncludesPhoenixdData(importedManifest.includesPhoenixdData);

    if (importedManifest.includesPhoenixdData) {
      setShowLightningWalletWarningModal(true);
      return;
    }

    await finishImport();
  };

  const handleConfirmLightningWalletOverwrite = async () => {
    setShowLightningWalletWarningModal(false);
    await finishImport();
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
      <ImportLightningWalletConfirmModal
        isOpen={showLightningWalletWarningModal}
        onOpenChange={setShowLightningWalletWarningModal}
        onConfirm={handleConfirmLightningWalletOverwrite}
        importDataTranslations={importDataTranslations}
      />
      <RestartRequiredModal
        isOpen={showRestartModal}
        onManualClose={() => setShowRestartModal(false)}
        onRestart={() => restartAppAfterImport(importedIncludesPhoenixdData)}
        includesPhoenixdData={importedIncludesPhoenixdData}
      />
    </>
  );
}
