"use client";

import { useCallback, useState } from "react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { resolveReportDateRange } from "../Reports/utils/reportDateRange";

export function useFreelanceReport({ skipForbiddenRedirect = false } = {}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchReport = useCallback(async (reportQuery) => {
    const reportDateRange = resolveReportDateRange(reportQuery);
    if (!reportDateRange) return;

    setLoading(true);
    setLoadError(null);

    try {
      const reportSearchParams = new URLSearchParams(reportDateRange);
      const reportResponse = await httpClient(
        `/freelance/billing-reports?${reportSearchParams.toString()}`,
        { skipForbiddenRedirect },
      );
      setForbidden(reportResponse.status === 403);
      if (!reportResponse.ok) return;

      setReport(await parseJsonResponse(reportResponse, null));
    } catch (loadReportError) {
      setLoadError(loadReportError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  return { report, loading, error: loadError, forbidden, fetchReport };
}
