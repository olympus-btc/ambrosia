"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";

import { PrinterAddForm } from "./PrinterAddForm";
import { PrinterConfigRow } from "./PrinterConfigRow";

export function PrintersCard({
  printerType,
  printerName,
  templateName,
  isDefault,
  enabled,
  availablePrinters,
  configRows,
  loadingAvailable,
  loadingConfigs,
  loadingTemplates,
  templates,
  error,
  saving,
  onPrinterTypeChange,
  onPrinterNameChange,
  onTemplateNameChange,
  onDefaultChange,
  onEnabledChange,
  onAdd,
  onUpdateConfig,
  onDeleteConfig,
  onSetDefaultConfig,
  t,
}) {
  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {t("cardPrinters.title")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {t("cardPrinters.subtitle")}
        </p>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col gap-6">
          <PrinterAddForm
            printerType={printerType}
            printerName={printerName}
            templateName={templateName}
            isDefault={isDefault}
            enabled={enabled}
            availablePrinters={availablePrinters}
            templates={templates}
            loadingAvailable={loadingAvailable}
            loadingTemplates={loadingTemplates}
            saving={saving}
            onPrinterTypeChange={onPrinterTypeChange}
            onPrinterNameChange={onPrinterNameChange}
            onTemplateNameChange={onTemplateNameChange}
            onDefaultChange={onDefaultChange}
            onEnabledChange={onEnabledChange}
            onSubmit={onAdd}
            t={t}
          />

          {error && (
            <p className="text-sm text-red-600">
              {t("cardPrinters.error")}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="text-sm sm:text-base font-semibold text-green-900">
                {t("cardPrinters.listTitle")}
              </h3>
              <span className="text-xs text-gray-500">
                {t("cardPrinters.listHint")}
              </span>
            </div>
            {loadingConfigs && (
              <p className="text-sm text-gray-600">
                {t("cardPrinters.loading")}
              </p>
            )}
            {!loadingConfigs && configRows.length === 0 && (
              <p className="text-sm text-gray-600">
                {t("cardPrinters.empty")}
              </p>
            )}
            {configRows.map((config) => (
              <PrinterConfigRow
                key={config.id}
                config={config}
                templates={templates}
                loadingTemplates={loadingTemplates}
                onTemplateChange={(value) => onUpdateConfig(config.id, { templateName: value })}
                onSetDefault={() => onSetDefaultConfig(config.id)}
                onToggleDefault={(value) => onUpdateConfig(config.id, { isDefault: value })}
                onToggleEnabled={(value) => onUpdateConfig(config.id, { enabled: value })}
                onRemove={() => onDeleteConfig(config.id)}
                t={t}
              />
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
