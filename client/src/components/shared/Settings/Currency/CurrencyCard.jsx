"use client";

import { useEffect, useState } from "react";

import { Button, Card, CardBody, CardHeader, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";
import { CurrencyInput } from "@components/shared/CurrencyInput";

export function CurrencyCard({
  selectedCurrency,
  currencies,
  onCurrencyChange,
  priceStep = 0.01,
  onPriceStepSave,
  isLoading = false,
}) {
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
    if (!onPriceStepSave || !hasUnsavedPriceStepChanges || !isPriceStepValid) return;
    setIsSavingPriceStep(true);
    try {
      await onPriceStepSave(draftPriceStep);
    } finally {
      setIsSavingPriceStep(false);
    }
  };

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("cardCurrency.title")}
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <CurrencyInput
          currencies={currencies}
          className="w-full sm:max-w-xs"
          size="sm"
          label={settingsTranslations("cardCurrency.currencyLabel")}
          selectedKey={selectedCurrency}
          onSelectionChange={onCurrencyChange}
          isDisabled={!canUpdateSettings}
        />

        <div className="space-y-2 max-w-xs">
          <NumberInput
            hideStepper
            size="sm"
            label={settingsTranslations("cardCurrency.priceStepLabel")}
            classNames={{ inputWrapper: "shadow-none" }}
            minValue={0.01}
            value={draftPriceStep}
            onValueChange={(priceStepValue) => setDraftPriceStep(priceStepValue ?? 0)}
            isDisabled={!canUpdateSettings || isLoading || isSavingPriceStep}
          />
          <p className="text-xs text-gray-500">
            {settingsTranslations("cardCurrency.priceStepHelp")}
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
                {settingsTranslations("cardCurrency.priceStepSaveButton")}
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
