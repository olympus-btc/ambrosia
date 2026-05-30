"use client";
import { useCallback, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "@/lib/http";

function buildReportsQueryString(filters = {}) {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  const query = params.toString();
  return `/reports${query ? `?${query}` : ""}`;
}

export function useReports() {
  const t = useTranslations("reports");
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

  return { fetchReport, reportData, loading, error, showError };
}
