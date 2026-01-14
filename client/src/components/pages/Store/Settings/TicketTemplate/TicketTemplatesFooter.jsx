"use client";

import { Button, ModalFooter, Select, SelectItem } from "@heroui/react";

export function TicketTemplatesFooter({
  selectedId,
  deleting,
  onDelete,
  printerType,
  onPrinterTypeChange,
  printerTypes,
  onPrintTest,
  printing,
  templateExists,
  onClose,
  onSave,
  saving,
  name,
  t,
}) {
  return (
    <ModalFooter className="flex justify-between">
      <div className="flex items-center gap-2">
        {selectedId && (
          <Button
            color="danger"
            variant="bordered"
            onPress={onDelete}
            isDisabled={deleting}
          >
            {t("templates.deleteTemplate")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select
          className="min-w-32 max-w-40"
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
          variant="bordered"
          onPress={onPrintTest}
          isDisabled={!templateExists || printing}
        >
          {printing ? t("templates.printing") : t("templates.printTest")}
        </Button>
        <Button variant="bordered" onPress={onClose}>
          {t("templates.close")}
        </Button>
        <Button color="primary" onPress={onSave} isDisabled={saving || !name.trim()}>
          {selectedId ? t("templates.saveChanges") : t("templates.saveNew")}
        </Button>
      </div>
    </ModalFooter>
  );
}
