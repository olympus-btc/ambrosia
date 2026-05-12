"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "@/lib/http";

export const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

function buildReportsQueryString(filters = {}) {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.productName?.trim()) params.set("productName", filters.productName.trim());
  if (filters.paymentMethod?.trim()) params.set("paymentMethod", filters.paymentMethod.trim());
  const query = params.toString();
  return `/reports${query ? `?${query}` : ""}`;
}

export function useReports() {
  const t = useTranslations("reports");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filtersRef = useRef(DEFAULT_FILTERS);
  const debounceRef = useRef(null);

  useEffect(() => { filtersRef.current = filters; });

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = buildReportsQueryString(params);
      const response = await httpClient(endpoint);
      const data = await parseJsonResponse(response, null);
      setReportData(data);
      return data;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const showError = useCallback(
    (message) => {
      addToast({ title: t("statuses.errorTitle"), description: message, variant: "solid", color: "danger" });
    },
    [t],
  );

  const validateDateRange = useCallback(
    (startDate, endDate) => {
      if (startDate && endDate && startDate > endDate) {
        showError(t("errors.invalidRange"));
        return false;
      }
      if ((startDate && !endDate) || (!startDate && endDate)) {
        showError(t("errors.bothDates"));
        return false;
      }
      return true;
    },
    [showError, t],
  );

  const generateReport = useCallback(async () => {
    const currentFilters = filtersRef.current;
    if (!currentFilters.activePeriod && !validateDateRange(currentFilters.startDate, currentFilters.endDate)) return;
    try {
      await fetchReport({
        period: currentFilters.activePeriod || undefined,
        startDate: currentFilters.activePeriod ? undefined : currentFilters.startDate || undefined,
        endDate: currentFilters.activePeriod ? undefined : currentFilters.endDate || undefined,
        productName: currentFilters.productName || undefined,
        paymentMethod: currentFilters.paymentMethod || undefined,
      });
    } catch {
      showError(t("statuses.errorGenerate"));
    }
  }, [fetchReport, validateDateRange, showError, t]);

  useEffect(() => {
    fetchReport({ period: DEFAULT_FILTERS.activePeriod });
  }, [fetchReport]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleFiltersChange = useCallback(
    (patch) => {
      const prev = filtersRef.current;
      const next = { ...prev, ...patch };
      setFilters(next);

      if ("activePeriod" in patch && patch.activePeriod) {
        fetchReport({
          period: next.activePeriod,
          productName: next.productName || undefined,
          paymentMethod: next.paymentMethod || undefined,
        });
      } else if ("startDate" in patch || "endDate" in patch) {
        if (next.startDate && next.endDate) {
          if (next.startDate <= next.endDate) {
            fetchReport({
              startDate: next.startDate,
              endDate: next.endDate,
              productName: next.productName || undefined,
              paymentMethod: next.paymentMethod || undefined,
            });
          } else {
            showError(t("errors.invalidRange"));
          }
        }
      } else if ("paymentMethod" in patch) {
        fetchReport({
          period: next.activePeriod || undefined,
          startDate: next.activePeriod ? undefined : next.startDate || undefined,
          endDate: next.activePeriod ? undefined : next.endDate || undefined,
          productName: next.productName || undefined,
          paymentMethod: next.paymentMethod || undefined,
        });
      } else {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const currentFilters = filtersRef.current;
          fetchReport({
            period: currentFilters.activePeriod || undefined,
            startDate: currentFilters.activePeriod ? undefined : currentFilters.startDate || undefined,
            endDate: currentFilters.activePeriod ? undefined : currentFilters.endDate || undefined,
            productName: currentFilters.productName || undefined,
            paymentMethod: currentFilters.paymentMethod || undefined,
          });
        }, 500);
      }
    },
    [fetchReport, showError, t],
  );

  const totalRevenue = useMemo(() => reportData?.totalRevenueCents ?? 0, [reportData]);
  const totalItems = useMemo(() => reportData?.totalItemsSold ?? 0, [reportData]);

  return {
    reportData,
    loading,
    error,
    filters,
    totalRevenue,
    totalItems,
    fetchReport,
    handleFiltersChange,
    generateReport,
  };
}
