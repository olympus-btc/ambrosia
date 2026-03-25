"use client";
import { useCallback } from "react";

import { httpClient, parseJsonResponse } from "@/lib/http";

export function useReports() {
  const generateReportFromData = useCallback(async (startDate, endDate) => {
    const response = await httpClient(
      `/reports?startDate=${startDate}&endDate=${endDate}`,
    );
    return await parseJsonResponse(response, null);
  }, []);

  return { generateReportFromData };
}
