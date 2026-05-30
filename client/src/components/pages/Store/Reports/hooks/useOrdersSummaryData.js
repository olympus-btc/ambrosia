"use client";
import { useMemo } from "react";

export function useOrdersSummaryData(reportData, orders) {
  const totalRevenue = useMemo(() => reportData?.totalRevenueCents ?? 0, [reportData]);
  const orderCount = useMemo(() => orders.length, [orders]);
  const averageTicket = useMemo(
    () => (orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0),
    [totalRevenue, orderCount],
  );
  const avgItemsPerOrder = useMemo(() => {
    const totalItems = reportData?.totalItemsSold ?? 0;
    return orderCount > 0 ? Math.round((totalItems / orderCount) * 10) / 10 : 0;
  }, [reportData, orderCount]);

  return { totalRevenue, orderCount, averageTicket, avgItemsPerOrder };
}
