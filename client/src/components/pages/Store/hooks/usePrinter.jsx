"use client";
import { useState, useEffect, useCallback } from "react";

import { apiClient } from "@/services/apiClient";

export function usePrinters() {
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [error, setError] = useState(null);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [printerConfigs, setPrinterConfigs] = useState([]);

  const fetchAvailablePrinters = useCallback(async () => {
    setLoadingAvailable(true);
    setError(null);

    try {
      const res = await apiClient("/printers/available");

      if (Array.isArray(res)) {
        setAvailablePrinters(res);
      } else {
        setAvailablePrinters([]);
      }
    } catch (err) {
      console.error("Error fetching printers:", err);
      setError(err);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  const fetchPrinterConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    setError(null);

    try {
      const res = await apiClient("/printers/configs");
      if (Array.isArray(res)) {
        setPrinterConfigs(res);
      } else {
        setPrinterConfigs([]);
      }
    } catch (err) {
      console.error("Error fetching printer configs:", err);
      setError(err);
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  const createPrinterConfig = useCallback(async (configBody) => {
    try {
      const created = await apiClient("/printers/configs", {
        method: "POST",
        body: configBody,
      });
      if (created?.id) {
        setPrinterConfigs((prev) => (Array.isArray(prev)
          ? [...prev, { ...configBody, id: created.id }]
          : [{ ...configBody, id: created.id }]),
        );
      }
      return created;
    } catch (err) {
      console.error("Error creating printer config:", err);
      setError(err);
      throw err;
    }
  }, []);

  const updatePrinterConfig = useCallback(async (configId, configBody) => {
    if (!configId) throw new Error("configId is required");
    try {
      await apiClient(`/printers/configs/${configId}`, {
        method: "PUT",
        body: configBody,
      });
      setPrinterConfigs((prev) => (Array.isArray(prev)
        ? prev.map((config) => (config.id === configId ? { ...config, ...configBody } : config),
        )
        : prev),
      );
      return true;
    } catch (err) {
      console.error("Error updating printer config:", err);
      setError(err);
      throw err;
    }
  }, []);

  const deletePrinterConfig = useCallback(async (configId) => {
    if (!configId) throw new Error("configId is required");
    try {
      await apiClient(`/printers/configs/${configId}`, { method: "DELETE" });
      setPrinterConfigs((prev) => (Array.isArray(prev) ? prev.filter((config) => config.id !== configId) : prev),
      );
      return true;
    } catch (err) {
      console.error("Error deleting printer config:", err);
      setError(err);
      throw err;
    }
  }, []);

  const setDefaultPrinterConfig = useCallback(async (configId) => {
    if (!configId) throw new Error("configId is required");
    try {
      await apiClient(`/printers/configs/${configId}/default`, { method: "POST" });
      setPrinterConfigs((prev) => {
        if (!Array.isArray(prev)) return prev;
        const target = prev.find((config) => config.id === configId);
        if (!target) return prev;
        return prev.map((config) => (config.printerType === target.printerType
          ? { ...config, isDefault: config.id === configId }
          : config),
        );
      });
      return true;
    } catch (err) {
      console.error("Error setting default printer config:", err);
      setError(err);
      throw err;
    }
  }, []);

  const setDefaultPrinterByName = useCallback(async (printerType, printerName) => {
    if (!printerType || !printerName) {
      throw new Error("printerType and printerName are required");
    }
    try {
      return await apiClient("/printers/set", {
        method: "POST",
        body: { printerType, printerName },
      });
    } catch (err) {
      console.error("Error setting default printer by name:", err);
      setError(err);
      throw err;
    }
  }, []);

  const printTicket = useCallback(async (printBody) => {
    try {
      return await apiClient("/printers/print", {
        method: "POST",
        body: printBody,
      });
    } catch (err) {
      console.error("Error printing ticket:", err);
      setError(err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAvailablePrinters();
    fetchPrinterConfigs();
  }, [fetchAvailablePrinters, fetchPrinterConfigs]);

  return {
    printers: availablePrinters,
    availablePrinters,
    printerConfigs,
    loading: loadingAvailable,
    loadingAvailable,
    loadingConfigs,
    error,
    refetch: fetchAvailablePrinters,
    refetchAvailable: fetchAvailablePrinters,
    refetchConfigs: fetchPrinterConfigs,
    refetchAll: () => Promise.all([fetchAvailablePrinters(), fetchPrinterConfigs()]),
    createPrinterConfig,
    updatePrinterConfig,
    deletePrinterConfig,
    setDefaultPrinterConfig,
    setDefaultPrinterByName,
    printTicket,
  };
}
