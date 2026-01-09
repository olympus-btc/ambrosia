"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";

import { PrinterAddForm } from "./PrinterAddForm";
import { PrinterConfigRow } from "./PrinterConfigRow";
import { TicketTemplatesModal } from "./TicketTemplatesModal";

export function PrinterSettingsCard({
  availablePrinters,
  printerConfigs,
  loadingAvailable,
  loadingConfigs,
  loadingTemplates,
  templates,
  error,
  createPrinterConfig,
  updatePrinterConfig,
  deletePrinterConfig,
  setDefaultPrinterConfig,
  t,
}) {
  const [printerType, setPrinterType] = useState("KITCHEN");
  const [printerName, setPrinterName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  useEffect(() => {
    if (!printerName && availablePrinters.length > 0) {
      setPrinterName(availablePrinters[0]);
    }
  }, [availablePrinters, printerName]);

  useEffect(() => {
    if (!templateName && Array.isArray(templates) && templates.length > 0) {
      setTemplateName(templates[0].name);
    }
  }, [templates, templateName]);

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
        templateName: templateName || null,
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
              onPrinterTypeChange={setPrinterType}
              onPrinterNameChange={setPrinterName}
              onTemplateNameChange={setTemplateName}
              onDefaultChange={setIsDefault}
              onEnabledChange={setEnabled}
              onSubmit={handleAdd}
              t={t}
            />

            {error && (
              <p className="text-sm text-red-600">
                {t("cardPrinters.error")}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-900">
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
                  onTemplateChange={(value) => updatePrinterConfig(config.id, { templateName: value })
                  }
                  onSetDefault={() => setDefaultPrinterConfig(config.id)}
                  onToggleDefault={(value) => updatePrinterConfig(config.id, { isDefault: value })
                  }
                  onToggleEnabled={(value) => updatePrinterConfig(config.id, { enabled: value })
                  }
                  onRemove={() => deletePrinterConfig(config.id)}
                  t={t}
                />
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
