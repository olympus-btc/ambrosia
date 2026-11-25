"use client";

import { addToast, Button } from "@heroui/react";
import { Download, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";

import { isElectron } from "@/lib/isElectron";

import { useLogsArchiveDownload } from "./hooks/useLogsArchiveDownload";

export const OPEN_LOGS_FOLDER_IPC_CHANNEL = "logs:open-folder";

export function LogFilesActions() {
  const logsTranslations = useTranslations("settings");
  const { downloadingLogsArchive, downloadLogsArchive } = useLogsArchiveDownload();

  const handleDownloadLogsArchive = async () => {
    const logsArchiveDownloaded = await downloadLogsArchive();
    if (!logsArchiveDownloaded) {
      addToast({ color: "danger", description: logsTranslations("cardLogs.downloadError") });
    }
  };

  const handleOpenLogsFolder = async () => {
    try {
      const openLogsFolderResult = await window.electron.ipc.invoke(OPEN_LOGS_FOLDER_IPC_CHANNEL);
      if (openLogsFolderResult?.success === false) throw new Error(openLogsFolderResult.error);
    } catch {
      addToast({ color: "danger", description: logsTranslations("cardLogs.openFolderError") });
    }
  };

  return (
    <>
      {isElectron && (
        <Button
          variant="bordered"
          size="sm"
          className="border border-green-800 text-green-800"
          startContent={<FolderOpen aria-hidden="true" className="w-3.5 h-3.5" />}
          onPress={handleOpenLogsFolder}
        >
          {logsTranslations("cardLogs.openFolderButton")}
        </Button>
      )}
      <Button
        variant="bordered"
        size="sm"
        className="border border-green-800 text-green-800"
        startContent={!downloadingLogsArchive && <Download aria-hidden="true" className="w-3.5 h-3.5" />}
        isLoading={downloadingLogsArchive}
        onPress={handleDownloadLogsArchive}
      >
        {logsTranslations("cardLogs.downloadAllButton")}
      </Button>
    </>
  );
}
