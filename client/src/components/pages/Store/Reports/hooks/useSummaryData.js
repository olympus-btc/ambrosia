"use client";
import { useMemo } from "react";

export function useSummaryData(reportData) {
  const totalRevenue = useMemo(() => reportData?.totalRevenueCents ?? 0, [reportData]);
  const totalItems = useMemo(() => reportData?.totalItemsSold ?? 0, [reportData]);
  return { totalRevenue, totalItems };
}
