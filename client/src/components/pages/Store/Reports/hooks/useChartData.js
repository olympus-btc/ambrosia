"use client";
import { useMemo } from "react";

import { parseUtcDate } from "@lib/formatDate";

function localDay(dateString) {
  const date = parseUtcDate(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function useChartData(sales) {
  const revenueByDay = useMemo(() => {
    const dailyRevenueMap = {};
    for (const sale of sales) {
      const dateKey = localDay(sale.saleDate);
      if (!dailyRevenueMap[dateKey]) dailyRevenueMap[dateKey] = { date: dateKey, revenue: 0, count: 0 };
      dailyRevenueMap[dateKey].revenue += sale.quantity * sale.priceAtOrder;
      dailyRevenueMap[dateKey].count += sale.quantity;
    }
    return Object.values(dailyRevenueMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const topProducts = useMemo(() => {
    const productRevenueMap = {};
    for (const sale of sales) {
      if (!productRevenueMap[sale.productName])
        productRevenueMap[sale.productName] = { name: sale.productName, revenue: 0, quantity: 0 };
      productRevenueMap[sale.productName].revenue += sale.quantity * sale.priceAtOrder;
      productRevenueMap[sale.productName].quantity += sale.quantity;
    }
    return Object.values(productRevenueMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [sales]);

  const paymentMethodSplit = useMemo(() => {
    const paymentMethodMap = {};
    for (const sale of sales) {
      const paymentMethodKey = sale.paymentMethod;
      if (!paymentMethodMap[paymentMethodKey]) paymentMethodMap[paymentMethodKey] = { method: paymentMethodKey, revenue: 0, count: 0 };
      paymentMethodMap[paymentMethodKey].revenue += sale.quantity * sale.priceAtOrder;
      paymentMethodMap[paymentMethodKey].count += 1;
    }
    return Object.values(paymentMethodMap).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  return { revenueByDay, topProducts, paymentMethodSplit };
}
