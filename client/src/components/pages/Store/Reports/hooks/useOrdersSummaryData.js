"use client";
import { useMemo } from "react";

export function useOrdersSummaryData(reportData, orders) {
  return useMemo(() => {
    const totalRevenue = reportData?.totalRevenueCents ?? 0;
    const orderCount = orders.length;
    const averageTicket = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    const totalItems = reportData?.totalItemsSold ?? 0;
    const avgItemsPerOrder = orderCount > 0 ? Math.round((totalItems / orderCount) * 10) / 10 : 0;
    return { totalRevenue, orderCount, averageTicket, avgItemsPerOrder };
  }, [reportData, orders]);
}
