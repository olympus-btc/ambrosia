"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePrinters } from "../../hooks/usePrinter";
import { useTemplates } from "../../hooks/useTemplates";

import { PrintersCard } from "./PrintersCard";

export function Printers() {
  const {
    availablePrinters,
    printerConfigs,
    loadingAvailable,
    loadingConfigs,
    error,
    createPrinterConfig,
    updatePrinterConfig,
    deletePrinterConfig,
    setDefaultPrinterConfig,
  } = usePrinters();
  const { templates, loading: loadingTemplates } = useTemplates();

  const [printerType, setPrinterType] = useState("CUSTOMER");
  const [printerName, setPrinterName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);
  const autoDefaultedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    const hasAvailable = availablePrinters.length > 0;
    const hasTemplates = Array.isArray(templates) && templates.length > 0;
    if (hasAvailable) setPrinterName(availablePrinters[0]);
    if (hasTemplates) setTemplateName(templates[0].name);
    if (hasAvailable || hasTemplates) initializedRef.current = true;
  }, [availablePrinters, templates]);

  useEffect(() => {
    if (autoDefaultedRef.current || loadingConfigs) return;
    autoDefaultedRef.current = true;
    if (Array.isArray(printerConfigs) && printerConfigs.length === 0) {
      setIsDefault(true);
    }
  }, [printerConfigs, loadingConfigs]);

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
      setPrinterType("CUSTOMER");
      setPrinterName(availablePrinters[0] ?? "");
      setTemplateName(templates?.[0]?.name ?? "");
      setIsDefault(false);
      setEnabled(true);
    } finally {
      setSaving(false);
    }
  };

  const printerFormState = {
    printerType, printerName, templateName, isDefault, enabled,
    onPrinterTypeChange: setPrinterType,
    onPrinterNameChange: setPrinterName,
    onTemplateNameChange: setTemplateName,
    onDefaultChange: setIsDefault,
    onEnabledChange: setEnabled,
  };
  const printerData = { availablePrinters, configRows, templates };
  const printerLoading = { available: loadingAvailable, configs: loadingConfigs, templates: loadingTemplates };
  const printerState = {
    error, saving,
    onAdd: handleAdd,
    onUpdateConfig: updatePrinterConfig,
    onDeleteConfig: deletePrinterConfig,
    onSetDefaultConfig: setDefaultPrinterConfig,
  };

  return (
    <PrintersCard
      formState={printerFormState}
      data={printerData}
      loading={printerLoading}
      state={printerState}
    />
  );
}
