"use client";

import { Button, Switch } from "@heroui/react";
import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { buildVisibleLogEntriesFileName, formatLogEntriesAsText } from "@/lib/logs";
import { downloadBlob } from "@/utils/downloadBlob";

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
  selectedLogSource,
  visibleLogEntries,
}) {
  const logsTranslations = useTranslations("settings");

  const handleDownloadVisibleLogEntries = () => {
    const visibleLogEntriesFile = new Blob([formatLogEntriesAsText(visibleLogEntries)], { type: "text/plain;charset=utf-8" });
    downloadBlob(visibleLogEntriesFile, buildVisibleLogEntriesFileName(selectedLogSource));
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
        <Button
          variant="bordered"
          size="sm"
          className="border border-green-800 text-green-800"
          startContent={<Trash2 aria-hidden="true" className="w-3.5 h-3.5" />}
          onPress={onClearVisibleLogEntries}
        >
          {logsTranslations("cardLogs.clearButton")}
        </Button>
        <Button
          variant="bordered"
          size="sm"
          className="border border-green-800 text-green-800"
          startContent={<Download aria-hidden="true" className="w-3.5 h-3.5" />}
          isDisabled={visibleLogEntries.length === 0}
          onPress={handleDownloadVisibleLogEntries}
        >
          {logsTranslations("cardLogs.downloadVisibleButton")}
        </Button>
      </div>
    </div>
  );
}
