"use client";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import { PriceStepField } from "./PriceStepField";

export function PriceStep() {
  const settingsTranslations = useTranslations("settings");
  const { config: businessConfig, updateConfig, isLoading } = useConfigurations();

  const handlePriceStepSave = async (priceStep) => {
    try {
      await updateConfig({ ...(businessConfig || {}), priceStep });
      addToast({
        title: settingsTranslations("cardPriceStep.successTitle"),
        description: settingsTranslations("cardPriceStep.successDescription"),
        color: "success",
      });
    } catch (updateConfigError) {
      console.error("Failed to update price step:", updateConfigError);
      addToast({
        title: settingsTranslations("cardPriceStep.errorTitle"),
        description: settingsTranslations("cardPriceStep.errorDescription"),
        color: "danger",
      });
    }
  };

  return (
    <PriceStepField
      priceStep={businessConfig?.priceStep ?? 0.01}
      onPriceStepSave={handlePriceStepSave}
      isLoading={isLoading}
    />
  );
}
