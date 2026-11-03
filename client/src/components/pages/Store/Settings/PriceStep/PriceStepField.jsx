"use client";

import { useEffect, useState } from "react";

import { Button, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";

export function PriceStepField({ priceStep = 0.01, onPriceStepSave, isLoading = false }) {
  const settingsTranslations = useTranslations("settings");
  const canUpdateSettings = usePermission({ allOf: ["settings_update"] });
  const [draftPriceStep, setDraftPriceStep] = useState(priceStep);
  const [isSavingPriceStep, setIsSavingPriceStep] = useState(false);

  useEffect(() => {
    setDraftPriceStep(priceStep);
  }, [priceStep]);

  const hasUnsavedPriceStepChanges = draftPriceStep !== priceStep;
  const isPriceStepValid = Number.isFinite(draftPriceStep) && draftPriceStep > 0;

  const handlePriceStepSave = async () => {
    if (!hasUnsavedPriceStepChanges || !isPriceStepValid) return;
    setIsSavingPriceStep(true);
    try {
      await onPriceStepSave(draftPriceStep);
    } finally {
      setIsSavingPriceStep(false);
    }
  };

  return (
    <div className="space-y-2 max-w-xs">
      <NumberInput
        hideStepper
        size="sm"
        label={settingsTranslations("cardPriceStep.label")}
        classNames={{ inputWrapper: "shadow-none" }}
        minValue={0.01}
        value={draftPriceStep}
        onValueChange={(priceStepValue) => setDraftPriceStep(priceStepValue ?? 0)}
        isDisabled={!canUpdateSettings || isLoading || isSavingPriceStep}
      />
      <p className="text-xs text-gray-500">
        {settingsTranslations("cardPriceStep.help")}
      </p>
      {canUpdateSettings && (
        <div className="flex justify-end">
          <Button
            color="primary"
            size="sm"
            isLoading={isSavingPriceStep}
            isDisabled={!hasUnsavedPriceStepChanges || !isPriceStepValid || isLoading || isSavingPriceStep}
            onPress={handlePriceStepSave}
          >
            {settingsTranslations("cardPriceStep.saveButton")}
          </Button>
        </div>
      )}
    </div>
  );
}
