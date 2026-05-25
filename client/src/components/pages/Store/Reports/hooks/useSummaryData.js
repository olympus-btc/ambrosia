"use client";
import { useMemo } from "react";

export function useSummaryData(reportData) {
  const totalRevenue = useMemo(() => reportData?.totalRevenueCents ?? 0, [reportData]);
  const totalItems = useMemo(() => reportData?.totalItemsSold ?? 0, [reportData]);
  const transactionCount = useMemo(() => reportData?.sales?.length ?? 0, [reportData]);
  const avgTicket = useMemo(() => {
    const count = reportData?.sales?.length ?? 0;
    const revenue = reportData?.totalRevenueCents ?? 0;
    return count > 0 ? Math.round(revenue / count) : 0;
  }, [reportData]);
  return { totalRevenue, totalItems, transactionCount, avgTicket };
}
