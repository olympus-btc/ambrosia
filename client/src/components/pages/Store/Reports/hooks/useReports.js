"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "@/lib/http";

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

  const handleDateRangeChange = (range) => onFiltersChange({ startDate: range?.start?.toString() ?? "", endDate: range?.end?.toString() ?? "", activePeriod: null });

  const handlePaymentMethod = (keys) => {
    const selectedKey = Array.from(keys)[0] ?? "all";
    onFiltersChange({ paymentMethod: selectedKey === "all" ? "" : selectedKey });
  };

  return { activeFilterCount, dateRangeValue, handlePeriodChange, handleDateRangeChange, handlePaymentMethod };
}

export const defaultFilters = {
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
  const [filters, setFilters] = useState(defaultFilters);
  const latestFiltersRef = useRef(defaultFilters);
  const debounceTimerRef = useRef(null);

  useEffect(() => { latestFiltersRef.current = filters; });

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

  const generateReport = useCallback(async () => {
    const currentFilters = latestFiltersRef.current;
    if (!currentFilters.activePeriod && (!currentFilters.startDate || !currentFilters.endDate)) return;
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
  }, [fetchReport, showError, t]);

  useEffect(() => {
    fetchReport({ period: defaultFilters.activePeriod });
  }, [fetchReport]);

  useEffect(() => () => clearTimeout(debounceTimerRef.current), []);

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

  const totalRevenue = useMemo(() => reportData?.totalRevenueCents ?? 0, [reportData]);
  const totalItems = useMemo(() => reportData?.totalItemsSold ?? 0, [reportData]);

  const sales = useMemo(() => reportData?.sales ?? [], [reportData]);

  const revenueByDay = useMemo(() => {
    const byDay = {};
    for (const sale of sales) {
      const day = sale.saleDate.slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, revenue: 0, count: 0 };
      byDay[day].revenue += sale.quantity * sale.priceAtOrder;
      byDay[day].count += sale.quantity;
    }
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const topProducts = useMemo(() => {
    const byProduct = {};
    for (const sale of sales) {
      if (!byProduct[sale.productName]) byProduct[sale.productName] = { name: sale.productName, revenue: 0, quantity: 0 };
      byProduct[sale.productName].revenue += sale.quantity * sale.priceAtOrder;
      byProduct[sale.productName].quantity += sale.quantity;
    }
    return Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [sales]);

  const paymentMethodSplit = useMemo(() => {
    const byMethod = {};
    for (const sale of sales) {
      const method = sale.paymentMethod;
      if (!byMethod[method]) byMethod[method] = { method, revenue: 0, count: 0 };
      byMethod[method].revenue += sale.quantity * sale.priceAtOrder;
      byMethod[method].count += 1;
    }
    return Object.values(byMethod).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  return {
    reportData,
    loading,
    error,
    filters,
    totalRevenue,
    totalItems,
    revenueByDay,
    topProducts,
    paymentMethodSplit,
    fetchReport,
    handleFiltersChange,
    generateReport,
  };
}
