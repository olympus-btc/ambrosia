"use client";

import { useMemo } from "react";

import { usePrinters } from "./usePrinter";

export function useHasCustomerPrinter() {
  const { printerConfigs, loadingConfigs } = usePrinters();

  const hasCustomerPrinter = useMemo(() => Array.isArray(printerConfigs) && printerConfigs.some(
    (printerConfig) => printerConfig?.printerType === "CUSTOMER" && printerConfig?.enabled !== false,
  ), [printerConfigs]);

  return { hasCustomerPrinter, loadingConfigs };
}
