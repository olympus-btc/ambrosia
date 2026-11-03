"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseDate } from "@internationalized/date";

export const defaultFilters = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
};

function getUtcOffsetMinutes() {
  return new Date().getTimezoneOffset();
}

export function buildReportQuery(filters) {
  if (filters.activePeriod) return { period: filters.activePeriod };
  if (filters.startDate && filters.endDate) {
    return { startDate: filters.startDate, endDate: filters.endDate, utcOffsetMinutes: getUtcOffsetMinutes() };
  }
  return null;
}

export function useDateRangeFilters(filters, onFiltersChange) {
  const dateRangeValue = useMemo(() => {
    if (filters.activePeriod || !filters.startDate || !filters.endDate) return null;
    return { start: parseDate(filters.startDate), end: parseDate(filters.endDate) };
  }, [filters.activePeriod, filters.startDate, filters.endDate]);

  const handlePeriodChange = (period) => onFiltersChange({ activePeriod: period, startDate: "", endDate: "" });

  const handleDateRangeChange = (dateRange) => onFiltersChange({
    startDate: dateRange?.start?.toString() ?? "",
    endDate: dateRange?.end?.toString() ?? "",
    activePeriod: null,
  });

  return { dateRangeValue, handlePeriodChange, handleDateRangeChange };
}

export function useFiltersState(fetchReport) {
  const [filters, setFilters] = useState(defaultFilters);
  const latestFiltersRef = useRef(defaultFilters);

  useEffect(() => { latestFiltersRef.current = filters; }, [filters]);

  useEffect(() => {
    fetchReport(buildReportQuery(defaultFilters));
  }, [fetchReport]);

  const handleFiltersChange = useCallback(
    (patch) => {
      const latestFilters = latestFiltersRef.current;
      const nextFilters = { ...latestFilters, ...patch };
      setFilters(nextFilters);

      const reportQuery = buildReportQuery(nextFilters);
      if (!reportQuery) return;
      return fetchReport(reportQuery);
    },
    [fetchReport],
  );

  const refetch = useCallback(() => {
    const reportQuery = buildReportQuery(latestFiltersRef.current);
    if (!reportQuery) return;
    return fetchReport(reportQuery);
  }, [fetchReport]);

  return { filters, handleFilters: handleFiltersChange, refetch };
}
