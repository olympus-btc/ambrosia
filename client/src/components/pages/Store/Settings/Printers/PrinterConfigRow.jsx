"use client";

import { Card, CardBody, Select, SelectItem, Switch } from "@heroui/react";

import { DeleteButton } from "@components/shared/DeleteButton";

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
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-col gap-3 p-4">
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-semibold text-green-900">
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

        <Select
          className="w-full"
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

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
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
              <span className="text-xs sm:text-sm">{t("cardPrinters.defaultLabel")}</span>
            </Switch>
            <Switch
              size="sm"
              isSelected={config.enabled}
              onValueChange={onToggleEnabled}
            >
              <span className="text-xs sm:text-sm">{t("cardPrinters.enabledLabel")}</span>
            </Switch>
          </div>
          <div className="shrink-0">
            <span className="sm:hidden">
              <DeleteButton onPress={onRemove} />
            </span>
            <span className="hidden sm:inline">
              <DeleteButton onPress={onRemove}>{t("cardPrinters.remove")}</DeleteButton>
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
