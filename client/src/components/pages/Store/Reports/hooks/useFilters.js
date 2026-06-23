"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseDate } from "@internationalized/date";

export const defaultFilters = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
};

export function useDateRangeFilters(filters, onFiltersChange) {
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

  return { dateRangeValue, handlePeriodChange, handleDateRangeChange };
}

export function useFiltersState(fetchReport) {
  const [filters, setFilters] = useState(defaultFilters);
  const latestFiltersRef = useRef(defaultFilters);

  useEffect(() => { latestFiltersRef.current = filters; }, [filters]);

  useEffect(() => {
    fetchReport({ period: defaultFilters.activePeriod });
  }, [fetchReport]);

  const handleFiltersChange = useCallback(
    (patch) => {
      const prev = latestFiltersRef.current;
      const next = { ...prev, ...patch };
      setFilters(next);

      if ("activePeriod" in patch && patch.activePeriod) {
        return fetchReport({ period: next.activePeriod });
      }

      if ("startDate" in patch || "endDate" in patch) {
        if (!next.startDate || !next.endDate) return;
        return fetchReport({ startDate: next.startDate, endDate: next.endDate });
      }
    },
    [fetchReport],
  );

  const refetch = useCallback(() => {
    const snapshotFilters = latestFiltersRef.current;
    fetchReport({
      period: snapshotFilters.activePeriod || undefined,
      startDate: snapshotFilters.activePeriod ? undefined : snapshotFilters.startDate || undefined,
      endDate: snapshotFilters.activePeriod ? undefined : snapshotFilters.endDate || undefined,
    });
  }, [fetchReport]);

  return { filters, handleFilters: handleFiltersChange, refetch };
}
