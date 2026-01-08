"use client";

import { Button, Select, SelectItem, Switch } from "@heroui/react";

export function PrinterConfigRow({
  config,
  templates,
  loadingTemplates,
  onTemplateChange,
  onSetDefault,
  onToggleDefault,
  onToggleEnabled,
  onRemove,
  t,
}) {
  return (
    <div className="grid gap-3 rounded-md border border-gray-200 bg-white p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
      <div className="flex flex-col">
        <span className="font-semibold text-green-900">
          {config.printerName}
        </span>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded-full border border-gray-200 px-2 py-0.5">
            {t(`cardPrinters.types.${config.printerType}`)}
          </span>
          {config.isDefault && (
            <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-green-700">
              {t("cardPrinters.defaultBadge")}
            </span>
          )}
          {!config.enabled && (
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-700">
              {t("cardPrinters.disabledBadge")}
            </span>
          )}
        </div>
      </div>

      <div>
        <Select
          className="min-w-52 max-w-full"
          label={t("cardPrinters.templateLabel")}
          selectedKeys={config.templateName ? [config.templateName] : []}
          onChange={(e) => onTemplateChange(e.target.value || null)}
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
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Switch
          size="sm"
          isSelected={config.isDefault}
          onValueChange={(value) => {
            if (value) {
              onSetDefault();
            } else {
              onToggleDefault(false);
            }
          }}
        >
          {t("cardPrinters.defaultLabel")}
        </Switch>
        <Switch
          size="sm"
          isSelected={config.enabled}
          onValueChange={onToggleEnabled}
        >
          {t("cardPrinters.enabledLabel")}
        </Switch>
        <Button color="danger" variant="bordered" onPress={onRemove}>
          {t("cardPrinters.remove")}
        </Button>
      </div>
    </div>
  );
}
