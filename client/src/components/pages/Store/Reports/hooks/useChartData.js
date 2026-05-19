"use client";
import { useMemo } from "react";

export function useChartData(sales) {
  const revenueByDay = useMemo(() => {
    const byDay = {};
    for (const sale of sales) {
      const day = sale.saleDate.slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, revenue: 0, count: 0 };
      byDay[day].revenue += sale.quantity * sale.priceAtOrder;
      byDay[day].count += sale.quantity;
    }
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const topProducts = useMemo(() => {
    const byProduct = {};
    for (const sale of sales) {
      if (!byProduct[sale.productName])
        byProduct[sale.productName] = { name: sale.productName, revenue: 0, quantity: 0 };
      byProduct[sale.productName].revenue += sale.quantity * sale.priceAtOrder;
      byProduct[sale.productName].quantity += sale.quantity;
    }
    return Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [sales]);

  const paymentMethodSplit = useMemo(() => {
    const byMethod = {};
    for (const sale of sales) {
      const method = sale.paymentMethod;
      if (!byMethod[method]) byMethod[method] = { method, revenue: 0, count: 0 };
      byMethod[method].revenue += sale.quantity * sale.priceAtOrder;
      byMethod[method].count += 1;
    }
    return Object.values(byMethod).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  return { revenueByDay, topProducts, paymentMethodSplit };
}
