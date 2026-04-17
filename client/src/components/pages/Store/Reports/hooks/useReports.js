"use client";
import { useCallback, useState } from "react";

import { httpClient, parseJsonResponse } from "@/lib/http";

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
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = buildReportsQueryString(filters);
      const response = await httpClient(endpoint);
      const data = await parseJsonResponse(response, null);
      setReportData(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { reportData, loading, error, fetchReport };
}
