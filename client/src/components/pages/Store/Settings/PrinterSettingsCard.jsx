"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Select, SelectItem } from "@heroui/react";
import { TicketTemplatesModal } from "./TicketTemplatesModal";

const PRINTER_TYPES = ["KITCHEN", "CUSTOMER", "BAR"];

export function PrinterSettingsCard({
  availablePrinters,
  printerConfigs,
  loadingAvailable,
  loadingConfigs,
  error,
  createPrinterConfig,
  updatePrinterConfig,
  deletePrinterConfig,
  setDefaultPrinterConfig,
  t,
}) {
  const [printerType, setPrinterType] = useState("KITCHEN");
  const [printerName, setPrinterName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  useEffect(() => {
    if (!printerName && availablePrinters.length > 0) {
      setPrinterName(availablePrinters[0]);
    }
  }, [availablePrinters, printerName]);

  const configRows = useMemo(() => {
    if (!Array.isArray(printerConfigs)) return [];
    return printerConfigs.slice().sort((a, b) => {
      if (a.printerType === b.printerType) {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.printerName.localeCompare(b.printerName);
      }
      return a.printerType.localeCompare(b.printerType);
    });
  }, [printerConfigs]);

  const handleAdd = async () => {
    if (!printerType || !printerName) return;
    setSaving(true);
    try {
      await createPrinterConfig({
        printerType,
        printerName,
        isDefault,
        enabled,
      });
      setIsDefault(false);
      setEnabled(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="rounded-lg mb-6 p-6">
      <CardHeader className="flex flex-col items-start">
        <div className="flex w-full flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-green-900">
              {t("cardPrinters.title")}
            </h2>
            <p className="text-gray-800 mt-2">
              {t("cardPrinters.subtitle")}
            </p>
          </div>
          <Button variant="bordered" onPress={() => setTemplatesModalOpen(true)}>
            {t("cardPrinters.manageTemplates")}
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <Select
              className="min-w-48 max-w-60"
              label={t("cardPrinters.typeLabel")}
              value={printerType}
              onChange={(e) => setPrinterType(e.target.value)}
            >
              {PRINTER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`cardPrinters.types.${type}`)}
                </SelectItem>
              ))}
            </Select>

            <Select
              className="min-w-48 max-w-72"
              label={t("cardPrinters.nameLabel")}
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
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

            <Button
              variant={isDefault ? "solid" : "bordered"}
              onPress={() => setIsDefault((prev) => !prev)}
            >
              {isDefault ? t("cardPrinters.defaultOn") : t("cardPrinters.defaultOff")}
            </Button>

            <Button
              variant={enabled ? "solid" : "bordered"}
              onPress={() => setEnabled((prev) => !prev)}
            >
              {enabled ? t("cardPrinters.enabledOn") : t("cardPrinters.enabledOff")}
            </Button>

            <Button
              color="primary"
              onPress={handleAdd}
              isDisabled={saving || loadingAvailable || !printerName}
            >
              {t("cardPrinters.addButton")}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {t("cardPrinters.error")}
            </p>
          )}

          <div className="flex flex-col gap-3">
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
              <div
                key={config.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-green-900">
                    {config.printerName}
                  </span>
                  <span className="text-sm text-gray-600">
                    {t(`cardPrinters.types.${config.printerType}`)}
                    {config.isDefault ? ` · ${t("cardPrinters.defaultBadge")}` : ""}
                    {config.enabled ? "" : ` · ${t("cardPrinters.disabledBadge")}`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="bordered"
                    isDisabled={config.isDefault}
                    onPress={() => setDefaultPrinterConfig(config.id)}
                  >
                    {t("cardPrinters.setDefault")}
                  </Button>
                  <Button
                    variant="bordered"
                    onPress={() =>
                      updatePrinterConfig(config.id, { enabled: !config.enabled })
                    }
                  >
                    {config.enabled ? t("cardPrinters.disable") : t("cardPrinters.enable")}
                  </Button>
                  <Button
                    color="danger"
                    variant="bordered"
                    onPress={() => deletePrinterConfig(config.id)}
                  >
                    {t("cardPrinters.remove")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
      </Card>
      {templatesModalOpen && (
        <TicketTemplatesModal
          isOpen={templatesModalOpen}
          onClose={() => setTemplatesModalOpen(false)}
        />
      )}
    </>
  );
}
