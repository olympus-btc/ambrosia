"use client";

import { useEffect, useState } from "react";

import { addToast, Button, Card, CardBody, CardHeader, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

const DEFAULT_DAILY_SESSION_RESET_HOUR = 6;
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, hour) => hour);

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function DailySessionResetCard() {
  const settingsTranslations = useTranslations("settings");
  const canUpdateSettings = usePermission({ allOf: ["settings_update"] });
  const { config: businessConfig, updateConfig, isLoading } = useConfigurations();
  const configuredHour = businessConfig?.dailySessionResetHour ?? DEFAULT_DAILY_SESSION_RESET_HOUR;
  const [draftHour, setDraftHour] = useState(configuredHour);
  const [isSavingHour, setIsSavingHour] = useState(false);

  useEffect(() => {
    setDraftHour(configuredHour);
  }, [configuredHour]);

  const hasUnsavedHourChanges = draftHour !== configuredHour;

  const handleSave = async () => {
    if (!hasUnsavedHourChanges) return;
    setIsSavingHour(true);
    try {
      await updateConfig({ ...(businessConfig || {}), dailySessionResetHour: draftHour });
      addToast({
        title: settingsTranslations("cardDailySessionReset.successTitle"),
        description: settingsTranslations("cardDailySessionReset.successDescription"),
        color: "success",
      });
    } catch (updateConfigError) {
      console.error("Failed to update the daily session reset hour:", updateConfigError);
      addToast({
        title: settingsTranslations("cardDailySessionReset.errorTitle"),
        description: settingsTranslations("cardDailySessionReset.errorDescription"),
        color: "danger",
      });
    } finally {
      setIsSavingHour(false);
    }
  };

  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("cardDailySessionReset.title")}
        </h2>
      </CardHeader>

      <CardBody className="gap-4">
        <p className="text-sm text-gray-500">{settingsTranslations("cardDailySessionReset.description")}</p>

        <Select
          className="max-w-xs"
          label={settingsTranslations("cardDailySessionReset.label")}
          selectedKeys={[String(draftHour)]}
          onChange={(hourChangeEvent) => {
            if (hourChangeEvent.target.value) setDraftHour(Number(hourChangeEvent.target.value));
          }}
          isDisabled={!canUpdateSettings || isLoading || isSavingHour}
        >
          {HOURS_OF_DAY.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {formatHour(hour)}
            </SelectItem>
          ))}
        </Select>

        {canUpdateSettings && (
          <div className="flex justify-end">
            <Button
              color="primary"
              size="sm"
              isLoading={isSavingHour}
              isDisabled={!hasUnsavedHourChanges || isLoading || isSavingHour}
              onPress={handleSave}
            >
              {settingsTranslations("cardDailySessionReset.saveButton")}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
