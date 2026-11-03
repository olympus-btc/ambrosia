"use client";

import { Card, CardBody, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";
import { DeleteButton } from "@components/shared/DeleteButton";

import { CashDrawerSettings } from "./CashDrawerSettings";

export function PrinterConfigRow({
  printerConfig,
  onSetDefault,
  onToggleDefault,
  onToggleEnabled,
  onRemove,
  paymentMethods,
  onCashDrawerChange,
}) {
  const settingsTranslations = useTranslations("settings");
  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-col gap-3 p-4">
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-semibold text-green-900">
            {printerConfig.printerName}
          </span>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="rounded-full border border-gray-200 px-2 py-0.5">
              {settingsTranslations(`cardPrinters.types.${printerConfig.printerType}`)}
            </span>
            {printerConfig.isDefault && (
              <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-green-700">
                {settingsTranslations("cardPrinters.defaultBadge")}
              </span>
            )}
            {!printerConfig.enabled && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-700">
                {settingsTranslations("cardPrinters.disabledBadge")}
              </span>
            )}
          </div>
        </div>

        <RequirePermission allOf={["printer_update"]}>
          <CashDrawerSettings
            printerConfig={printerConfig}
            paymentMethods={paymentMethods}
            onCashDrawerChange={onCashDrawerChange}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Switch
                size="sm"
                isSelected={printerConfig.isDefault}
                onValueChange={(isDefaultSelected) => {
                  if (isDefaultSelected) {
                    onSetDefault();
                  } else {
                    onToggleDefault(false);
                  }
                }}
              >
                <span className="text-xs sm:text-sm">{settingsTranslations("cardPrinters.defaultLabel")}</span>
              </Switch>
              <Switch
                size="sm"
                isSelected={printerConfig.enabled}
                onValueChange={onToggleEnabled}
              >
                <span className="text-xs sm:text-sm">{settingsTranslations("cardPrinters.enabledLabel")}</span>
              </Switch>
            </div>
            <div className="shrink-0">
              <span className="sm:hidden">
                <DeleteButton onPress={onRemove} />
              </span>
              <span className="hidden sm:inline">
                <DeleteButton onPress={onRemove}>{settingsTranslations("cardPrinters.remove")}</DeleteButton>
              </span>
            </div>
          </div>
        </RequirePermission>
      </CardBody>
    </Card>
  );
}
