"use client";

import { useEffect, useRef } from "react";

import { Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { LogEntryRow } from "./LogEntryRow";

const AUTO_SCROLL_BOTTOM_TOLERANCE_PIXELS = 24;

export function LogsViewer({ logEntries, isLoading }) {
  const logsTranslations = useTranslations("settings");
  const logsContainerRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const handleLogsContainerScroll = () => {
    const logsContainer = logsContainerRef.current;
    if (!logsContainer) return;
    const distanceFromBottomPixels = logsContainer.scrollHeight - logsContainer.scrollTop - logsContainer.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottomPixels <= AUTO_SCROLL_BOTTOM_TOLERANCE_PIXELS;
  };

  useEffect(() => {
    const logsContainer = logsContainerRef.current;
    if (!logsContainer || !shouldStickToBottomRef.current) return;
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }, [logEntries]);

  const hasLogEntries = logEntries.length > 0;

  return (
    <div
      ref={logsContainerRef}
      onScroll={handleLogsContainerScroll}
      className="h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs"
      data-testid="logs-viewer"
    >
      {isLoading && !hasLogEntries && (
        <div className="flex items-center gap-2 text-gray-500">
          <Spinner size="sm" />
          <span>{logsTranslations("cardLogs.loading")}</span>
        </div>
      )}
      {!isLoading && !hasLogEntries && <p className="text-gray-500">{logsTranslations("cardLogs.emptyState")}</p>}
      {hasLogEntries && (
        <ul>
          {logEntries.map((logEntry) => (
            <LogEntryRow key={logEntry.viewerEntryKey} logEntry={logEntry} />
          ))}
        </ul>
      )}
    </div>
  );
}
