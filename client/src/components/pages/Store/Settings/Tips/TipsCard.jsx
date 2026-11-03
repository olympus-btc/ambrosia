"use client";

import { useEffect, useState } from "react";

import { Button, Card, CardBody, CardHeader, NumberInput, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

import { toNumberInputValue } from "@/components/utils/numberParsers";
import { usePermission } from "@/hooks/usePermission";

import {
  DEFAULT_CUSTOM_TIP_TYPE,
  DEFAULT_TIP_PERCENTAGES,
  normalizeTipPercentages,
  parseTipPercentages,
} from "../../Cart/utils/tipCalculations";

const STANDARD_TIP_PERCENTAGES = [5, 10, 15, 20, 25];
const CUSTOM_TIP_TYPE_OPTIONS = [
  { type: "percentage", symbol: "%" },
  { type: "fixed", symbol: "$" },
];

export function TipsCard({
  tipsEnabled = true,
  tipPercentages = "10,15,20",
  customTipDefaultType = DEFAULT_CUSTOM_TIP_TYPE,
  onSave,
  isLoading = false,
}) {
  const settingsTranslations = useTranslations("settings");
  const canUpdateSettings = usePermission({ allOf: ["settings_update"] });

  const [draftTipsEnabled, setDraftTipsEnabled] = useState(tipsEnabled);
  const [selectedPercentages, setSelectedPercentages] = useState(() => parseTipPercentages(tipPercentages));
  const [draftCustomTipDefaultType, setDraftCustomTipDefaultType] = useState(customTipDefaultType);
  const [isSaving, setIsSaving] = useState(false);
  const [isCustomEditorOpen, setIsCustomEditorOpen] = useState(false);
  const [customPercentage, setCustomPercentage] = useState(0);

  useEffect(() => {
    setDraftTipsEnabled(tipsEnabled);
  }, [tipsEnabled]);

  useEffect(() => {
    setSelectedPercentages(parseTipPercentages(tipPercentages));
  }, [tipPercentages]);

  useEffect(() => {
    setDraftCustomTipDefaultType(customTipDefaultType);
  }, [customTipDefaultType]);

  const configuredPercentages = normalizeTipPercentages(tipPercentages)
    ?? DEFAULT_TIP_PERCENTAGES.join(",");
  const serializedSelectedPercentages = selectedPercentages.join(",");
  const availablePercentageOptions = [...new Set([
    ...STANDARD_TIP_PERCENTAGES,
    ...parseTipPercentages(tipPercentages),
    ...selectedPercentages,
  ])].sort((a, b) => a - b);
  const hasUnsavedChanges = draftTipsEnabled !== tipsEnabled
    || serializedSelectedPercentages !== configuredPercentages
    || draftCustomTipDefaultType !== customTipDefaultType;
  const hasValidPercentageSelection = !draftTipsEnabled || selectedPercentages.length > 0;
  const isCustomPercentageValid = Number.isFinite(customPercentage)
    && customPercentage > 0
    && customPercentage <= 100
    && !selectedPercentages.includes(customPercentage);

  function handlePercentageToggle(percentage) {
    setSelectedPercentages((currentPercentages) => (
      currentPercentages.includes(percentage)
        ? currentPercentages.filter((selectedPercentage) => selectedPercentage !== percentage)
        : [...currentPercentages, percentage].sort((first, second) => first - second)
    ));
  }

  function handleCustomAdd() {
    if (!isCustomPercentageValid) return;
    setSelectedPercentages((currentPercentages) => (
      [...currentPercentages, customPercentage].sort((first, second) => first - second)
    ));
    setCustomPercentage(0);
    setIsCustomEditorOpen(false);
  }

  async function handleSave() {
    if (!onSave || !hasUnsavedChanges || !hasValidPercentageSelection) return;
    setIsSaving(true);
    try {
      await onSave({
        tipsEnabled: draftTipsEnabled,
        tipPercentages: serializedSelectedPercentages,
        customTipDefaultType: draftCustomTipDefaultType,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("cardTips.title")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          {settingsTranslations("cardTips.subtitle")}
        </p>
      </CardHeader>

      <CardBody className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-gray-700">
              {settingsTranslations("cardTips.enableTips")}
            </span>
            <p className="text-xs text-gray-500">
              {settingsTranslations("cardTips.enableTipsDescription")}
            </p>
          </div>
          <Switch
            isSelected={draftTipsEnabled}
            onValueChange={setDraftTipsEnabled}
            isDisabled={!canUpdateSettings || isLoading || isSaving}
            color="primary"
            aria-label={settingsTranslations("cardTips.enableTips")}
          />
        </div>

        {draftTipsEnabled && (
          <div className="space-y-2" role="group" aria-label={settingsTranslations("cardTips.percentagesLabel")}>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {settingsTranslations("cardTips.percentagesLabel")}
              </p>
              <p className="text-xs text-gray-500">
                {settingsTranslations("cardTips.percentagesHelp")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {availablePercentageOptions.map((percentage) => {
                const isSelected = selectedPercentages.includes(percentage);
                return (
                  <Button
                    key={percentage}
                    size="sm"
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "solid" : "flat"}
                    className="min-w-14"
                    aria-pressed={isSelected}
                    isDisabled={!canUpdateSettings || isLoading || isSaving}
                    onPress={() => handlePercentageToggle(percentage)}
                  >
                    {percentage}%
                  </Button>
                );
              })}

              <Button
                size="sm"
                color={isCustomEditorOpen ? "primary" : "default"}
                variant={isCustomEditorOpen ? "solid" : "flat"}
                className="min-w-14"
                isDisabled={!canUpdateSettings || isLoading || isSaving}
                onPress={() => setIsCustomEditorOpen((isOpen) => !isOpen)}
              >
                {settingsTranslations("cardTips.customPercentage")}
              </Button>
            </div>

            {isCustomEditorOpen && (
              <div className="flex max-w-xs items-stretch gap-2">
                <NumberInput
                  hideStepper
                  autoFocus
                  minValue={1}
                  maxValue={100}
                  size="sm"
                  value={customPercentage}
                  endContent="%"
                  aria-label={settingsTranslations("cardTips.customPercentageLabel")}
                  classNames={{ inputWrapper: "shadow-none" }}
                  isInvalid={customPercentage > 0 && !isCustomPercentageValid}
                  onValueChange={(value) => setCustomPercentage(value ?? 0)}
                  onChange={(event) => setCustomPercentage(toNumberInputValue(event))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleCustomAdd();
                    if (event.key === "Escape") setIsCustomEditorOpen(false);
                  }}
                />
                <Button
                  color="primary"
                  size="sm"
                  className="h-auto!"
                  isDisabled={!isCustomPercentageValid}
                  onPress={handleCustomAdd}
                >
                  {settingsTranslations("cardTips.addPercentage")}
                </Button>
              </div>
            )}

            {!hasValidPercentageSelection && (
              <p className="text-xs text-red-600">
                {settingsTranslations("cardTips.percentagesError")}
              </p>
            )}
          </div>
        )}

        {draftTipsEnabled && (
          <div className="space-y-2" role="group" aria-label={settingsTranslations("cardTips.customTipDefaultTypeLabel")}>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {settingsTranslations("cardTips.customTipDefaultTypeLabel")}
              </p>
              <p className="text-xs text-gray-500">
                {settingsTranslations("cardTips.customTipDefaultTypeHelp")}
              </p>
            </div>

            <div className="flex gap-2">
              {CUSTOM_TIP_TYPE_OPTIONS.map(({ type, symbol }) => {
                const isSelected = draftCustomTipDefaultType === type;
                return (
                  <Button
                    key={type}
                    size="sm"
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "solid" : "flat"}
                    className="min-w-14"
                    aria-pressed={isSelected}
                    isDisabled={!canUpdateSettings || isLoading || isSaving}
                    onPress={() => setDraftCustomTipDefaultType(type)}
                  >
                    {symbol}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {canUpdateSettings && (
          <div className="flex justify-end pt-2">
            <Button
              color="primary"
              size="sm"
              isLoading={isSaving}
              isDisabled={!hasUnsavedChanges || !hasValidPercentageSelection || isLoading || isSaving}
              onPress={handleSave}
            >
              {settingsTranslations("cardTips.saveButton")}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
