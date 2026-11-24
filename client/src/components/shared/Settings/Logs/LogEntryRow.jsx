"use client";

import { useTranslations } from "next-intl";

import { parseDateValue } from "@/lib/formatDate";

import { resolveLogLevelTextClassName } from "./logLevelTextClassNames";

const LOG_TIMESTAMP_FORMAT_OPTIONS = {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

export function formatLogTimestamp(logTimestamp) {
  const parsedLogTimestamp = parseDateValue(logTimestamp);
  if (Number.isNaN(parsedLogTimestamp.getTime())) return logTimestamp;
  return parsedLogTimestamp.toLocaleString(undefined, LOG_TIMESTAMP_FORMAT_OPTIONS);
}

export function LogEntryRow({ logEntry }) {
  const logsTranslations = useTranslations("settings");
  const logLevelTextClassName = resolveLogLevelTextClassName(logEntry.level);

  return (
    <li className="border-b border-gray-100 py-1 last:border-b-0" data-testid="log-entry-row">
      <div className="flex flex-wrap gap-x-2 break-all">
        <span className="text-gray-400 shrink-0">{formatLogTimestamp(logEntry.timestamp)}</span>
        <span className={`font-semibold shrink-0 w-12 ${logLevelTextClassName}`}>{logEntry.level}</span>
        <span className="text-gray-500 shrink-0">{logEntry.logger}</span>
        <span className="text-gray-900 whitespace-pre-wrap">{logEntry.message}</span>
      </div>
      {logEntry.details && (
        <details className="ml-4 mt-1">
          <summary className="cursor-pointer text-gray-500">{logsTranslations("cardLogs.showDetails")}</summary>
          <pre className="whitespace-pre-wrap break-all text-gray-600">{logEntry.details}</pre>
        </details>
      )}
    </li>
  );
}
