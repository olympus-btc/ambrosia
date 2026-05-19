"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseDate } from "@internationalized/date";

export const defaultFilters = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

export function useDateRangeFilters(filters, onFiltersChange) {
  const activeFilterCount = useMemo(
    () => [filters.activePeriod, filters.startDate, filters.endDate, filters.productName, filters.paymentMethod]
      .filter(Boolean).length,
    [filters],
  );

  const dateRangeValue = useMemo(() => {
    if (!filters.startDate || !filters.endDate) return null;
    return { start: parseDate(filters.startDate), end: parseDate(filters.endDate) };
  }, [filters.startDate, filters.endDate]);

  const handlePeriodChange = (period) => onFiltersChange({ activePeriod: period, startDate: "", endDate: "" });

  const handleDateRangeChange = (range) => onFiltersChange({
    startDate: range?.start?.toString() ?? "",
    endDate: range?.end?.toString() ?? "",
    activePeriod: null,
  });

  const handlePaymentMethod = (keys) => {
    const selectedKey = Array.from(keys)[0] ?? "all";
    onFiltersChange({ paymentMethod: selectedKey === "all" ? "" : selectedKey });
  };

  return { activeFilterCount, dateRangeValue, handlePeriodChange, handleDateRangeChange, handlePaymentMethod };
}

export function useFiltersState(fetchReport) {
  const [filters, setFilters] = useState(defaultFilters);
  const latestFiltersRef = useRef(defaultFilters);
  const debounceTimerRef = useRef(null);

  useEffect(() => { latestFiltersRef.current = filters; });
  useEffect(() => () => clearTimeout(debounceTimerRef.current), []);

  useEffect(() => {
    fetchReport({ period: defaultFilters.activePeriod });
  }, [fetchReport]);

  const handleFiltersChange = useCallback(
    (patch) => {
      const prev = latestFiltersRef.current;
      const next = { ...prev, ...patch };
      setFilters(next);

      if ("activePeriod" in patch && patch.activePeriod) {
        return fetchReport({
          period: next.activePeriod,
          productName: next.productName || undefined,
          paymentMethod: next.paymentMethod || undefined,
        });
      }

      if ("startDate" in patch || "endDate" in patch) {
        if (!next.startDate || !next.endDate) return;
        return fetchReport({
          startDate: next.startDate,
          endDate: next.endDate,
          productName: next.productName || undefined,
          paymentMethod: next.paymentMethod || undefined,
        });
      }

      if ("paymentMethod" in patch) {
        return fetchReport({
          period: next.activePeriod || undefined,
          startDate: next.activePeriod ? undefined : next.startDate || undefined,
          endDate: next.activePeriod ? undefined : next.endDate || undefined,
          productName: next.productName || undefined,
          paymentMethod: next.paymentMethod || undefined,
        });
      }

      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const currentFilters = latestFiltersRef.current;
        fetchReport({
          period: currentFilters.activePeriod || undefined,
          startDate: currentFilters.activePeriod ? undefined : currentFilters.startDate || undefined,
          endDate: currentFilters.activePeriod ? undefined : currentFilters.endDate || undefined,
          productName: currentFilters.productName || undefined,
          paymentMethod: currentFilters.paymentMethod || undefined,
        });
      }, 500);
    },
    [fetchReport],
  );

  return { filters, handleFilters: handleFiltersChange };
}
