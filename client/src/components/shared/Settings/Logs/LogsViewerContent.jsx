"use client";

import { useTranslations } from "next-intl";

import { useLogsViewer } from "./hooks/useLogsViewer";
import { LogsFilters } from "./LogsFilters";
import { LogsToolbar } from "./LogsToolbar";
import { LogsViewer } from "./LogsViewer";

const DEFAULT_UNAVAILABLE_REASON = "log_file_not_found";

export function LogsViewerContent() {
  const logsTranslations = useTranslations("settings");
  const logsViewer = useLogsViewer();
  const unavailableReason = logsViewer.selectedLogSourceAvailability?.unavailableReason ?? DEFAULT_UNAVAILABLE_REASON;

  return (
    <>
      <LogsFilters
        selectedLogSource={logsViewer.selectedLogSource}
        onLogSourceChange={logsViewer.selectLogSource}
        minimumLogLevelFilter={logsViewer.minimumLogLevelFilter}
        onMinimumLogLevelFilterChange={logsViewer.setMinimumLogLevelFilter}
        searchText={logsViewer.searchText}
        onSearchTextChange={logsViewer.setSearchText}
      />

      <LogsToolbar
        isLiveStreamEnabled={logsViewer.isLiveStreamEnabled}
        onLiveStreamEnabledChange={logsViewer.changeLiveStreamEnabled}
        liveLogStreamConnected={logsViewer.liveLogStreamConnected}
        isLiveStreamToggleDisabled={!logsViewer.isSelectedLogSourceAvailable}
        onClearVisibleLogEntries={logsViewer.clearVisibleLogEntries}
        selectedLogSource={logsViewer.selectedLogSource}
        visibleLogEntries={logsViewer.visibleLogEntries}
      />

      {logsViewer.isSelectedLogSourceAvailable ? (
        <LogsViewer logEntries={logsViewer.visibleLogEntries} isLoading={logsViewer.loadingLogHistory} />
      ) : (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500" data-testid="logs-source-unavailable">
          {logsTranslations(`cardLogs.unavailableReasons.${unavailableReason}`)}
        </p>
      )}
    </>
  );
}
