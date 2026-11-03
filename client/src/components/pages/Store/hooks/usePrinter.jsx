"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

export function usePrinters() {
  const { fetchList } = useFetchList();
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [error, setError] = useState(null);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [printerConfigs, setPrinterConfigs] = useState([]);

  const fetchAvailablePrinters = useCallback(async () => {
    setLoadingAvailable(true);
    setError(null);

    try {
      const printersData = await fetchList("/printers/available", [], { skipForbiddenRedirect: true });
      setAvailablePrinters(toArray(printersData));
    } catch (error) {
      console.error("Error fetching printers:", error);
      setError(error);
    } finally {
      setLoadingAvailable(false);
    }
  }, [fetchList]);

  const fetchPrinterConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    setError(null);

    try {
      const printerDataConfigs = await fetchList("/printers/configs", [], { skipForbiddenRedirect: true });
      setPrinterConfigs(toArray(printerDataConfigs));
    } catch (error) {
      console.error("Error fetching printer configs:", error);
      setError(error);
    } finally {
      setLoadingConfigs(false);
    }
  }, [fetchList]);

  const createPrinterConfig = useCallback(async (configBody) => {
    try {
      const createPrinterConfig = await httpClient("/printers/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configBody),
        skipForbiddenRedirect: true,
      });

      const createdPrinterDataConfig = await parseJsonResponse(createPrinterConfig, null);

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
        skipForbiddenRedirect: true,
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
      await httpClient(`/printers/configs/${configId}`, { method: "DELETE", skipForbiddenRedirect: true });
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
      await httpClient(`/printers/configs/${configId}/default`, { method: "POST", skipForbiddenRedirect: true });
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
        skipForbiddenRedirect: true,
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
        skipForbiddenRedirect: true,
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
