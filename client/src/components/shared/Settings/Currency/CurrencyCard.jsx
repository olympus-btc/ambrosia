"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";
import { CurrencyInput } from "@components/shared/CurrencyInput";

export function CurrencyCard({ selectedCurrency, currencies, onCurrencyChange, extraCurrencySettings }) {
  const settingsTranslations = useTranslations("settings");
  const canUpdateSettings = usePermission({ allOf: ["settings_update"] });

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

        {extraCurrencySettings}
      </CardBody>
    </Card>
  );
}
