"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { exportBackup } from "@/services/backupService";

import { ExportDataCardLocked } from "./ExportDataCardLocked";
import { ExportDataCardUnlocked } from "./ExportDataCardUnlocked";

export function ExportData() {
  const exportDataTranslations = useTranslations("settings");
  const [showAccess, setShowAccess] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);

  const handleAuthorized = async (password) => {
    setExportProgress(null);
    try {
      await exportBackup(password, setExportProgress);
      addToast({ color: "success", description: exportDataTranslations("cardExportData.success") });
    } catch {
      addToast({ color: "danger", description: exportDataTranslations("cardExportData.errorDescription") });
    } finally {
      setShowAccess(false);
      setExportProgress(null);
    }
  };

  if (showAccess) {
    return (
      <ExportDataCardUnlocked
        onAuthorized={handleAuthorized}
        onHide={() => setShowAccess(false)}
        exportDataTranslations={exportDataTranslations}
        exportProgress={exportProgress}
      />
    );
  }

  return (
    <ExportDataCardLocked
      onReveal={() => setShowAccess(true)}
      exportDataTranslations={exportDataTranslations}
    />
  );
}
