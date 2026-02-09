"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient } from "@/lib/http/httpClient";

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
      const printers = await httpClient("/printers/available");

      const printersData = await printers.json();

      if (Array.isArray(printersData)) {
        setAvailablePrinters(printersData);
      } else {
        setAvailablePrinters([]);
      }
    } catch (error) {
      console.error("Error fetching printers:", error);
      setError(error);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  const fetchPrinterConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    setError(null);

    try {
      const printerConfigs = await httpClient("/printers/configs");

      const printerDataConfigs = await printerConfigs.json();

      if (Array.isArray(printerDataConfigs)) {
        setPrinterConfigs(printerDataConfigs);
      } else {
        setPrinterConfigs([]);
      }
    } catch (error) {
      console.error("Error fetching printer configs:", error);
      setError(error);
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  const createPrinterConfig = useCallback(async (configBody) => {
    try {
      const createPrinterConfig = await httpClient("/printers/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configBody),
      });

      const createdPrinterDataConfig = await createPrinterConfig.json();

      if (createdPrinterDataConfig?.id) {
        setPrinterConfigs((prev) => (Array.isArray(prev)
          ? [...prev, { ...configBody, id: createdPrinterDataConfig.id }]
          : [{ ...configBody, id: createdPrinterDataConfig.id }]),
        );
      }
      return createdPrinterDataConfig;
    } catch (error) {
      console.error("Error creating printer config:", error);
      setError(error);
      throw error;
    }
  }, []);

  const updatePrinterConfig = useCallback(async (configId, configBody) => {
    if (!configId) throw new Error("config Id is required");
    try {
      await httpClient(`/printers/configs/${configId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configBody),
      });
      setPrinterConfigs((prev) => (Array.isArray(prev)
        ? prev.map((config) => (config.id === configId ? { ...config, ...configBody } : config),
        )
        : prev),
      );
      return true;
    } catch (error) {
      console.error("Error updating printer config:", error);
      setError(error);
      throw error;
    }
  }, []);

  const deletePrinterConfig = useCallback(async (configId) => {
    if (!configId) throw new Error("config Id is required");
    try {
      await httpClient(`/printers/configs/${configId}`, { method: "DELETE" });
      setPrinterConfigs((prev) => (Array.isArray(prev) ? prev.filter((config) => config.id !== configId) : prev),
      );
      return true;
    } catch (error) {
      console.error("Error deleting printer config:", error);
      setError(error);
      throw error;
    }
  }, []);

  const setDefaultPrinterConfig = useCallback(async (configId) => {
    if (!configId) throw new Error("configId is required");
    try {
      await httpClient(`/printers/configs/${configId}/default`, { method: "POST" });
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
    } catch (error) {
      console.error("Error setting default printer config:", error);
      setError(error);
      throw error;
    }
  }, []);

  const setDefaultPrinterByName = useCallback(async (printerType, printerName) => {
    if (!printerType || !printerName) {
      throw new Error("printerType and printerName are required");
    }
    try {
      return await httpClient("/printers/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ printerType, printerName }),
      });
    } catch (error) {
      console.error("Error setting default printer by name:", error);
      setError(error);
      throw error;
    }
  }, []);

  const printTicket = useCallback(async (printBody) => {
    try {
      return await httpClient("/printers/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(printBody),
      });
    } catch (error) {
      console.error("Error printing ticket:", error);
      setError(error);
      throw error;
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
