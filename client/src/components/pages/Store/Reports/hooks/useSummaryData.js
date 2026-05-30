"use client";
import { useMemo } from "react";

export function useSummaryData(reportData) {
  const totalRevenue = useMemo(() => reportData?.totalRevenueCents ?? 0, [reportData]);
  const totalItems = useMemo(() => reportData?.totalItemsSold ?? 0, [reportData]);
  const productLines = useMemo(() => reportData?.sales?.length ?? 0, [reportData]);
  const uniqueProducts = useMemo(
    () => new Set((reportData?.sales ?? []).map((sale) => sale.productName)).size,
    [reportData],
  );
  return { totalRevenue, totalItems, productLines, uniqueProducts };
}
