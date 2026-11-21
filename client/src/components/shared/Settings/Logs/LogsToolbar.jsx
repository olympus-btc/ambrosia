"use client";

import { addToast, Button, Switch } from "@heroui/react";
import { Download, FolderOpen, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { isElectron } from "@/lib/isElectron";

import { useLogsArchiveDownload } from "./hooks/useLogsArchiveDownload";

export const OPEN_LOGS_FOLDER_IPC_CHANNEL = "logs:open-folder";

function resolveLiveStatusTranslationKey({ isLiveStreamEnabled, liveLogStreamConnected }) {
  if (!isLiveStreamEnabled) return "cardLogs.livePaused";
  return liveLogStreamConnected ? "cardLogs.liveConnected" : "cardLogs.liveConnecting";
}

export function LogsToolbar({
  isLiveStreamEnabled,
  onLiveStreamEnabledChange,
  liveLogStreamConnected,
  isLiveStreamToggleDisabled,
  onClearVisibleLogEntries,
}) {
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Switch
          isSelected={isLiveStreamEnabled}
          onValueChange={onLiveStreamEnabledChange}
          isDisabled={isLiveStreamToggleDisabled}
          size="sm"
        >
          {logsTranslations("cardLogs.liveLabel")}
        </Switch>
        <span className="text-xs text-gray-500" data-testid="logs-live-status">
          {logsTranslations(resolveLiveStatusTranslationKey({ isLiveStreamEnabled, liveLogStreamConnected }))}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="flat" size="sm" startContent={<Trash2 className="h-4 w-4" />} onPress={onClearVisibleLogEntries}>
          {logsTranslations("cardLogs.clearButton")}
        </Button>
        {isElectron && (
          <Button variant="flat" size="sm" startContent={<FolderOpen className="h-4 w-4" />} onPress={handleOpenLogsFolder}>
            {logsTranslations("cardLogs.openFolderButton")}
          </Button>
        )}
        <Button
          color="primary"
          size="sm"
          startContent={!downloadingLogsArchive && <Download className="h-4 w-4" />}
          isLoading={downloadingLogsArchive}
          onPress={handleDownloadLogsArchive}
        >
          {logsTranslations("cardLogs.downloadButton")}
        </Button>
      </div>
    </div>
  );
}
