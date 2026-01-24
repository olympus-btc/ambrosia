"use client";

import { Button, Select, SelectItem, Switch } from "@heroui/react";

const PRINTER_TYPES = ["CUSTOMER"];

export function PrinterAddForm({
  printerType,
  printerName,
  templateName,
  isDefault,
  enabled,
  availablePrinters,
  templates,
  loadingAvailable,
  loadingTemplates,
  saving,
  onPrinterTypeChange,
  onPrinterNameChange,
  onTemplateNameChange,
  onDefaultChange,
  onEnabledChange,
  onSubmit,
  t,
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-green-900">
          {t("cardPrinters.addTitle")}
        </h3>
        <p className="text-sm text-gray-600">
          {t("cardPrinters.addDescription")}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3 xl:items-end">
        <Select
          label={t("cardPrinters.typeLabel")}
          value={printerType}
          onChange={(e) => onPrinterTypeChange(e.target.value)}
        >
          {PRINTER_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {t(`cardPrinters.types.${type}`)}
            </SelectItem>
          ))}
        </Select>

        <Select
          label={t("cardPrinters.nameLabel")}
          value={printerName}
          onChange={(e) => onPrinterNameChange(e.target.value)}
        >
          {availablePrinters.length === 0 && (
            <SelectItem key="none" value="">
              {t("cardPrinters.noAvailable")}
            </SelectItem>
          )}
          {availablePrinters.map((printer) => (
            <SelectItem key={printer} value={printer}>
              {printer}
            </SelectItem>
          ))}
        </Select>

        <Select
          label={t("cardPrinters.templateLabel")}
          selectedKeys={templateName ? [templateName] : []}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          isLoading={loadingTemplates}
        >
          <SelectItem key="none" value="">
            {t("cardPrinters.templateNone")}
          </SelectItem>
          {Array.isArray(templates) &&
            templates.map((template) => (
              <SelectItem key={template.name} value={template.name}>
                {template.name}
              </SelectItem>
            ))}
        </Select>

        <div className="flex flex-wrap items-center gap-4 xl:col-span-3 xl:justify-end">
          <Switch
            size="sm"
            isSelected={isDefault}
            onValueChange={onDefaultChange}
          >
            {t("cardPrinters.defaultLabel")}
          </Switch>

          <Switch
            size="sm"
            isSelected={enabled}
            onValueChange={onEnabledChange}
          >
            {t("cardPrinters.enabledLabel")}
          </Switch>

          <Button
            color="primary"
            onPress={onSubmit}
            isDisabled={saving || loadingAvailable || !printerName || !templateName}
          >
            {t("cardPrinters.addButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
