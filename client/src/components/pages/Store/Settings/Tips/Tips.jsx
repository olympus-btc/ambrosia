"use client";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import { DEFAULT_CUSTOM_TIP_TYPE } from "../../Cart/utils/tipCalculations";

import { TipsCard } from "./TipsCard";

export function Tips() {
  const settingsTranslations = useTranslations("settings");
  const { config, updateConfig, isLoading } = useConfigurations();

  async function handleTipsSave({ tipsEnabled, tipPercentages, customTipDefaultType }) {
    try {
      await updateConfig({
        ...(config || {}),
        tipsEnabled,
        tipPercentages,
        customTipDefaultType,
      });
      addToast({
        title: settingsTranslations("cardTips.title"),
        description: settingsTranslations("cardTips.successMessage"),
        color: "success",
      });
    } catch (error) {
      console.error("Failed to update tip configuration:", error);
      addToast({
        title: settingsTranslations("cardTips.title"),
        description: settingsTranslations("cardTips.errorMessage"),
        color: "danger",
      });
    }
  }

  return (
    <TipsCard
      tipsEnabled={config?.tipsEnabled !== false}
      tipPercentages={config?.tipPercentages || "10,15,20"}
      customTipDefaultType={config?.customTipDefaultType || DEFAULT_CUSTOM_TIP_TYPE}
      onSave={handleTipsSave}
      isLoading={isLoading}
    />
  );
}
