"use client";

import { Button, Card, CardBody, Select, SelectItem, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

const PRINTER_TYPES = ["CUSTOMER"];

export function PrinterAddForm({ formState, data, loading, saving }) {
  const settingsTranslations = useTranslations("settings");
  const {
    printerType, printerName, isDefault, enabled,
    onPrinterTypeChange, onPrinterNameChange,
    onDefaultChange, onEnabledChange, onSubmit,
  } = formState;
  const { availablePrinters } = data;
  const { available: loadingAvailable } = loading;
  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-col gap-4 p-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-green-900">
            {settingsTranslations("cardPrinters.addTitle")}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            {settingsTranslations("cardPrinters.addDescription")}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            {settingsTranslations("cardPrinters.templatesHint")}
          </p>
        </div>

        <Select
          label={settingsTranslations("cardPrinters.typeLabel")}
          value={printerType}
          onChange={(e) => onPrinterTypeChange(e.target.value)}
        >
          {PRINTER_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {settingsTranslations(`cardPrinters.types.${type}`)}
            </SelectItem>
          ))}
        </Select>

        <Select
          label={settingsTranslations("cardPrinters.nameLabel")}
          value={printerName}
          onChange={(e) => onPrinterNameChange(e.target.value)}
        >
          {availablePrinters.length === 0 && (
            <SelectItem key="none" value="">
              {settingsTranslations("cardPrinters.noAvailable")}
            </SelectItem>
          )}
          {availablePrinters.map((printer) => (
            <SelectItem key={printer} value={printer}>
              {printer}
            </SelectItem>
          ))}
        </Select>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Switch
              size="sm"
              isSelected={isDefault}
              onValueChange={onDefaultChange}
            >
              <span className="text-xs sm:text-sm">{settingsTranslations("cardPrinters.defaultLabel")}</span>
            </Switch>

            <Switch
              size="sm"
              isSelected={enabled}
              onValueChange={onEnabledChange}
            >
              <span className="text-xs sm:text-sm">{settingsTranslations("cardPrinters.enabledLabel")}</span>
            </Switch>
          </div>

          <Button
            color="primary"
            className="h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium bg-green-800 shrink-0"
            onPress={onSubmit}
            isDisabled={saving || loadingAvailable || !printerName}
          >
            {settingsTranslations("cardPrinters.addButton")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
