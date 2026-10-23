"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";

import { PrinterAddForm } from "./PrinterAddForm";
import { PrinterConfigRow } from "./PrinterConfigRow";

export function PrintersCard({ formState, data, loading, state }) {
  const settingsTranslations = useTranslations("settings");
  const { configRows } = data;
  const { configs: loadingConfigs } = loading;
  const { error, saving, onAdd, onUpdateConfig, onDeleteConfig, onSetDefaultConfig } = state;

  const addFormState = { ...formState, onSubmit: onAdd };

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("cardPrinters.title")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {settingsTranslations("cardPrinters.subtitle")}
        </p>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col gap-6">
          <RequirePermission allOf={["printer_update"]}>
            <PrinterAddForm
              formState={addFormState}
              data={data}
              loading={loading}
              saving={saving}
            />
          </RequirePermission>

          {error && (
            <p className="text-sm text-red-600">
              {settingsTranslations("cardPrinters.error")}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="text-sm sm:text-base font-semibold text-green-900">
                {settingsTranslations("cardPrinters.listTitle")}
              </h3>
              <span className="text-xs text-gray-500">
                {settingsTranslations("cardPrinters.listHint")}
              </span>
            </div>
            {loadingConfigs && (
              <p className="text-sm text-gray-600">
                {settingsTranslations("cardPrinters.loading")}
              </p>
            )}
            {!loadingConfigs && configRows.length === 0 && (
              <p className="text-sm text-gray-600">
                {settingsTranslations("cardPrinters.empty")}
              </p>
            )}
            {configRows.map((printerConfig) => (
              <PrinterConfigRow
                key={printerConfig.id}
                printerConfig={printerConfig}
                onSetDefault={() => onSetDefaultConfig(printerConfig.id)}
                onToggleDefault={(isDefault) => onUpdateConfig(printerConfig.id, { isDefault })}
                onToggleEnabled={(enabled) => onUpdateConfig(printerConfig.id, { enabled })}
                onRemove={() => onDeleteConfig(printerConfig.id)}
                paymentMethods={data.paymentMethods}
                onCashDrawerChange={(cashDrawerUpdates) => onUpdateConfig(printerConfig.id, cashDrawerUpdates)}
              />
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
