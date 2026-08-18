"use client";
import { useMemo } from "react";

export function useSummaryData(reportData) {
  return useMemo(() => {
    const sales = reportData?.sales ?? [];
    return {
      totalRevenue: reportData?.totalRevenueCents ?? 0,
      totalItems: reportData?.totalItemsSold ?? 0,
      productLines: sales.length,
      uniqueProducts: new Set(sales.map((sale) => sale.productName)).size,
      totalRefunded: reportData?.totalRefundedCents ?? 0,
      totalRefundedSatoshis: reportData?.totalRefundedSatoshis ?? 0,
      refundCount: reportData?.refundCount ?? 0,
    };
  }, [reportData]);
}
