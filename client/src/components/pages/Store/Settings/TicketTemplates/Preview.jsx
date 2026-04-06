"use client";

import { Button, Select, SelectItem } from "@heroui/react";

import { TicketElementsPreview } from "./TicketElements";

export function TemplatePreview({
  elements,
  config,
  printerType,
  onPrinterTypeChange,
  printerTypes,
  onPrintTest,
  printing,
  templateExists,
  t,
}) {
  return (
    <div className="w-full lg:flex-1 lg:sticky lg:top-0">
      <div className="flex flex-col">
        <h3 className="text-base sm:text-lg font-semibold text-green-900">
          {t("templates.previewTitle")}
        </h3>
        <div className="mt-4 flex items-end gap-2">
          <Select
            className="flex-1"
            label={t("templates.printTypeLabel")}
            selectedKeys={printerType ? [printerType] : []}
            onChange={onPrinterTypeChange}
          >
            {printerTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`cardPrinters.types.${type}`)}
              </SelectItem>
            ))}
          </Select>
          <Button
            className="h-14 bg-green-800 text-white shrink-0"
            onPress={onPrintTest}
            isDisabled={!templateExists || printing}
          >
            {printing ? t("templates.printing") : t("templates.printTest")}
          </Button>
        </div>
      </div>

      <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {!elements || elements.length === 0 ? (
          <p className="text-sm text-gray-600">
            {t("templates.previewEmpty")}
          </p>
        ) : (
          <div className="font-mono text-gray-900">
            <TicketElementsPreview elements={elements} config={config} />
          </div>
        )}
      </div>
    </div>
  );
}
