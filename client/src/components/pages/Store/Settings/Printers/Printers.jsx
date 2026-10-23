"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePaymentMethods } from "../../Cart/hooks/usePaymentMethod";
import { usePrinters } from "../../hooks/usePrinter";

import { PrintersCard } from "./PrintersCard";

export function Printers() {
  const settingsTranslations = useTranslations("settings");
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
  const { paymentMethods } = usePaymentMethods();

  const [printerType, setPrinterType] = useState("CUSTOMER");
  const [printerName, setPrinterName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const initializedRef = useRef(false);
  const autoDefaultedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || availablePrinters.length === 0) return;
    setPrinterName(availablePrinters[0]);
    initializedRef.current = true;
  }, [availablePrinters]);

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
        isDefault,
        enabled,
      });
      setPrinterType("CUSTOMER");
      setPrinterName(availablePrinters[0] ?? "");
      setIsDefault(false);
      setEnabled(true);
      addToast({ description: settingsTranslations("cardPrinters.saveSuccess"), color: "success" });
    } catch {
      addToast({ description: settingsTranslations("cardPrinters.saveError"), color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await updatePrinterConfig(id, data);
      addToast({ description: settingsTranslations("cardPrinters.updateSuccess"), color: "success" });
    } catch {
      addToast({ description: settingsTranslations("cardPrinters.updateError"), color: "danger" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePrinterConfig(id);
      addToast({ description: settingsTranslations("cardPrinters.deleteSuccess"), color: "success" });
    } catch {
      addToast({ description: settingsTranslations("cardPrinters.deleteError"), color: "danger" });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultPrinterConfig(id);
      addToast({ description: settingsTranslations("cardPrinters.setDefaultSuccess"), color: "success" });
    } catch {
      addToast({ description: settingsTranslations("cardPrinters.setDefaultError"), color: "danger" });
    }
  };

  const printerFormState = {
    printerType, printerName, isDefault, enabled,
    onPrinterTypeChange: setPrinterType,
    onPrinterNameChange: setPrinterName,
    onDefaultChange: setIsDefault,
    onEnabledChange: setEnabled,
  };
  const printerData = { availablePrinters, configRows, paymentMethods };
  const printerLoading = { available: loadingAvailable, configs: loadingConfigs };
  const printerState = {
    error,
    saving,
    onAdd: handleAdd,
    onUpdateConfig: handleUpdate,
    onDeleteConfig: handleDelete,
    onSetDefaultConfig: handleSetDefault,
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
