"use client";
import { useMemo } from "react";

import { formatDateParts } from "@lib/formatDate";

export function useChartData(sales) {
  const { revenueByDay, topProducts, paymentMethodSplit } = useMemo(() => {
    const dailyRevenueMap = {};
    const productRevenueMap = {};
    const paymentMethodMap = {};

    for (const sale of sales) {
      const dateKey = formatDateParts(sale.saleDate).localDay;
      const saleRevenue = sale.quantity * sale.priceAtOrder;
      const method = sale.paymentMethod;

      if (!dailyRevenueMap[dateKey]) dailyRevenueMap[dateKey] = { date: dateKey, revenue: 0, count: 0 };
      dailyRevenueMap[dateKey].revenue += saleRevenue;
      dailyRevenueMap[dateKey].count += sale.quantity;

      if (!productRevenueMap[sale.productName]) productRevenueMap[sale.productName] = { name: sale.productName, revenue: 0, quantity: 0 };
      productRevenueMap[sale.productName].revenue += saleRevenue;
      productRevenueMap[sale.productName].quantity += sale.quantity;

      if (!paymentMethodMap[method]) paymentMethodMap[method] = { method, revenue: 0, count: 0 };
      paymentMethodMap[method].revenue += saleRevenue;
      paymentMethodMap[method].count += 1;
    }

    return {
      revenueByDay: Object.values(dailyRevenueMap).sort((left, right) => left.date.localeCompare(right.date)),
      topProducts: Object.values(productRevenueMap).sort((left, right) => right.revenue - left.revenue).slice(0, 8),
      paymentMethodSplit: Object.values(paymentMethodMap).sort((left, right) => right.revenue - left.revenue),
    };
  }, [sales]);

  return { revenueByDay, topProducts, paymentMethodSplit };
}
