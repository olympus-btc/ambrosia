"use client";

import { addToast, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { CONFIGURABLE_SERVER_LOG_LEVELS } from "@/lib/logs";

import { useServerLogLevel } from "./hooks/useServerLogLevel";
import { LogLevelsGuide } from "./LogLevelsGuide";

export function ServerLogLevelSelect() {
  const logsTranslations = useTranslations("settings");
  const { serverLogLevel, updatingServerLogLevel, updateServerLogLevel } = useServerLogLevel();

  const handleServerLogLevelChange = async (serverLogLevelChangeEvent) => {
    const requestedServerLogLevel = serverLogLevelChangeEvent.target.value;
    if (!requestedServerLogLevel || requestedServerLogLevel === serverLogLevel) return;
    const serverLogLevelUpdated = await updateServerLogLevel(requestedServerLogLevel);
    addToast({
      color: serverLogLevelUpdated ? "success" : "danger",
      description: logsTranslations(
        serverLogLevelUpdated ? "cardLogs.serverLogLevelUpdated" : "cardLogs.serverLogLevelUpdateError",
      ),
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
      <Select
        className="max-w-xs"
        label={logsTranslations("cardLogs.serverLogLevelLabel")}
        description={logsTranslations("cardLogs.serverLogLevelDescription")}
        selectedKeys={serverLogLevel ? [serverLogLevel] : []}
        onChange={handleServerLogLevelChange}
        isDisabled={!serverLogLevel || updatingServerLogLevel}
        disallowEmptySelection
      >
        {CONFIGURABLE_SERVER_LOG_LEVELS.map((configurableServerLogLevel) => (
          <SelectItem key={configurableServerLogLevel}>{configurableServerLogLevel}</SelectItem>
        ))}
      </Select>
      <LogLevelsGuide />
    </div>
  );
}
