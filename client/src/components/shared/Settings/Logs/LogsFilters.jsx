"use client";

import { Input, Select, SelectItem } from "@heroui/react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { LOG_FILTER_LEVELS, LOG_SOURCES } from "@/lib/logs";

import { ALL_LOG_LEVELS_FILTER_KEY } from "./hooks/useLogsViewer";

export function LogsFilters({
  selectedLogSource,
  onLogSourceChange,
  minimumLogLevelFilter,
  onMinimumLogLevelFilterChange,
  searchText,
  onSearchTextChange,
}) {
  const logsTranslations = useTranslations("settings");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label={logsTranslations("cardLogs.sourceLabel")}
        selectedKeys={[selectedLogSource]}
        onChange={(logSourceChangeEvent) => {
          if (logSourceChangeEvent.target.value) onLogSourceChange(logSourceChangeEvent.target.value);
        }}
        disallowEmptySelection
      >
        {LOG_SOURCES.map((logSourceId) => (
          <SelectItem key={logSourceId}>{logsTranslations(`cardLogs.sources.${logSourceId}`)}</SelectItem>
        ))}
      </Select>

      <Select
        label={logsTranslations("cardLogs.levelFilterLabel")}
        selectedKeys={[minimumLogLevelFilter]}
        onChange={(logLevelFilterChangeEvent) => {
          if (logLevelFilterChangeEvent.target.value) onMinimumLogLevelFilterChange(logLevelFilterChangeEvent.target.value);
        }}
        disallowEmptySelection
      >
        {[ALL_LOG_LEVELS_FILTER_KEY, ...LOG_FILTER_LEVELS].map((logLevelFilterKey) => (
          <SelectItem key={logLevelFilterKey}>
            {logLevelFilterKey === ALL_LOG_LEVELS_FILTER_KEY
              ? logsTranslations("cardLogs.allLevels")
              : logsTranslations("cardLogs.levelOrHigher", { level: logLevelFilterKey })}
          </SelectItem>
        ))}
      </Select>

      <Input
        className="lg:col-span-2"
        label={logsTranslations("cardLogs.searchLabel")}
        placeholder={logsTranslations("cardLogs.searchPlaceholder")}
        value={searchText}
        onValueChange={onSearchTextChange}
        startContent={<Search className="h-4 w-4 text-gray-400" />}
        isClearable
        onClear={() => onSearchTextChange("")}
      />
    </div>
  );
}
