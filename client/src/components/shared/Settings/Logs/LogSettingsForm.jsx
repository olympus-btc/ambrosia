"use client";

import { useState } from "react";

import { addToast, Button, Chip, Select, SelectItem, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

import {
  CONFIGURABLE_LOG_MAXIMUM_TOTAL_SIZE_MEGABYTES,
  CONFIGURABLE_LOG_RETENTION_DAYS,
  CONFIGURABLE_SERVER_LOG_LEVELS,
  LOG_LEVEL_INFO,
} from "@/lib/logs";

import { useLogSettings } from "./hooks/useLogSettings";
import { resolveLogLevelTextClassName } from "./logLevelTextClassNames";

function hasLogSettingsChanged(draftLogSettings, savedLogSettings) {
  if (!draftLogSettings || !savedLogSettings) return false;
  return Object.keys(savedLogSettings).some(
    (logSettingName) => draftLogSettings[logSettingName] !== savedLogSettings[logSettingName],
  );
}

export function LogSettingsForm() {
  const logsTranslations = useTranslations("settings");
  const { logSettings, savingLogSettings, saveLogSettings } = useLogSettings();
  const [unsavedLogSettingChanges, setUnsavedLogSettingChanges] = useState({});
  const draftLogSettings = logSettings ? { ...logSettings, ...unsavedLogSettingChanges } : null;

  const hasUnsavedLogSettingsChanges = hasLogSettingsChanged(draftLogSettings, logSettings);
  const areLogSettingsDisabled = !draftLogSettings || savingLogSettings;

  const changeDraftLogSetting = (logSettingName, logSettingValue) => {
    setUnsavedLogSettingChanges((previousUnsavedLogSettingChanges) => ({
      ...previousUnsavedLogSettingChanges,
      [logSettingName]: logSettingValue,
    }));
  };

  const handleSaveLogSettings = async () => {
    if (!hasUnsavedLogSettingsChanges) return;
    const logSettingsSaved = await saveLogSettings(draftLogSettings);
    if (logSettingsSaved) setUnsavedLogSettingChanges({});
    addToast({
      color: logSettingsSaved ? "success" : "danger",
      description: logsTranslations(logSettingsSaved ? "cardLogs.settingsSaved" : "cardLogs.settingsSaveError"),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm sm:text-base font-semibold text-green-900">
          {logsTranslations("cardLogs.settingsTitle")}
        </h3>
        <p className="text-xs text-gray-500">{logsTranslations("cardLogs.settingsSubtitle")}</p>
      </div>

      <Select
        label={logsTranslations("cardLogs.serverLogLevelLabel")}
        description={draftLogSettings && logsTranslations(`cardLogs.levelDescriptions.${draftLogSettings.level}`)}
        selectedKeys={draftLogSettings ? [draftLogSettings.level] : []}
        onChange={(serverLogLevelChangeEvent) => {
          if (serverLogLevelChangeEvent.target.value) changeDraftLogSetting("level", serverLogLevelChangeEvent.target.value);
        }}
        isDisabled={areLogSettingsDisabled}
        disallowEmptySelection
      >
        {CONFIGURABLE_SERVER_LOG_LEVELS.map((configurableServerLogLevel) => (
          <SelectItem
            key={configurableServerLogLevel}
            textValue={configurableServerLogLevel}
            classNames={{ description: "whitespace-normal" }}
            description={logsTranslations(`cardLogs.levelDescriptions.${configurableServerLogLevel}`)}
          >
            <span className="flex items-center gap-2">
              <span className={`font-mono font-semibold ${resolveLogLevelTextClassName(configurableServerLogLevel)}`}>
                {configurableServerLogLevel}
              </span>
              {configurableServerLogLevel === LOG_LEVEL_INFO && (
                <Chip size="sm" variant="flat" color="success">
                  {logsTranslations("cardLogs.recommendedLevel")}
                </Chip>
              )}
            </span>
          </SelectItem>
        ))}
      </Select>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Select
          label={logsTranslations("cardLogs.retentionDaysLabel")}
          description={logsTranslations("cardLogs.retentionDaysDescription")}
          selectedKeys={draftLogSettings ? [String(draftLogSettings.retentionDays)] : []}
          onChange={(retentionDaysChangeEvent) => {
            if (retentionDaysChangeEvent.target.value) {
              changeDraftLogSetting("retentionDays", Number(retentionDaysChangeEvent.target.value));
            }
          }}
          isDisabled={areLogSettingsDisabled}
          disallowEmptySelection
        >
          {CONFIGURABLE_LOG_RETENTION_DAYS.map((configurableRetentionDays) => (
            <SelectItem key={String(configurableRetentionDays)}>
              {logsTranslations("cardLogs.retentionDaysOption", { days: configurableRetentionDays })}
            </SelectItem>
          ))}
        </Select>

        <Select
          label={logsTranslations("cardLogs.maximumTotalSizeLabel")}
          description={logsTranslations("cardLogs.maximumTotalSizeDescription")}
          selectedKeys={draftLogSettings ? [String(draftLogSettings.maximumTotalSizeMegabytes)] : []}
          onChange={(maximumTotalSizeChangeEvent) => {
            if (maximumTotalSizeChangeEvent.target.value) {
              changeDraftLogSetting("maximumTotalSizeMegabytes", Number(maximumTotalSizeChangeEvent.target.value));
            }
          }}
          isDisabled={areLogSettingsDisabled}
          disallowEmptySelection
        >
          {CONFIGURABLE_LOG_MAXIMUM_TOTAL_SIZE_MEGABYTES.map((configurableMaximumTotalSizeMegabytes) => (
            <SelectItem key={String(configurableMaximumTotalSizeMegabytes)}>
              {logsTranslations("cardLogs.maximumTotalSizeOption", { megabytes: configurableMaximumTotalSizeMegabytes })}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Switch
          isSelected={Boolean(draftLogSettings?.clientErrorReportingEnabled)}
          onValueChange={(clientErrorReportingEnabled) => {
            changeDraftLogSetting("clientErrorReportingEnabled", clientErrorReportingEnabled);
          }}
          isDisabled={areLogSettingsDisabled}
          size="sm"
        >
          <span className="text-sm font-medium">{logsTranslations("cardLogs.clientErrorReportingLabel")}</span>
        </Switch>
        <p className="text-xs text-gray-500">{logsTranslations("cardLogs.clientErrorReportingDescription")}</p>
      </div>

      <div className="flex justify-end">
        <Button
          color="primary"
          size="sm"
          isLoading={savingLogSettings}
          isDisabled={!hasUnsavedLogSettingsChanges || savingLogSettings}
          onPress={handleSaveLogSettings}
        >
          {logsTranslations("cardLogs.saveSettingsButton")}
        </Button>
      </div>
    </div>
  );
}
