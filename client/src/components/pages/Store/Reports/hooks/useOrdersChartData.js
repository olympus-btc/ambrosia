"use client";
import { useMemo } from "react";

import { useTranslations } from "next-intl";

import { formatDateParts } from "@lib/formatDate";

export function useOrdersChartData(orders) {
  const reportsTranslations = useTranslations("reports");
  const { ordersPerDay, paymentMethodByOrders, topUsersByOrders } = useMemo(() => {
    const dailyStatsMap = {};
    const paymentMethodMap = {};
    const userStatsMap = {};

    for (const order of orders) {
      const dateKey = formatDateParts(order.date).localDay;
      const method = order.paymentMethod;
      const userName = order.userName || reportsTranslations("orders.unknownUser");

      if (!dailyStatsMap[dateKey]) dailyStatsMap[dateKey] = { date: dateKey, orders: 0, revenue: 0 };
      dailyStatsMap[dateKey].orders += 1;
      dailyStatsMap[dateKey].revenue += order.total;

      if (!paymentMethodMap[method]) paymentMethodMap[method] = { method, count: 0, revenue: 0 };
      paymentMethodMap[method].count += 1;
      paymentMethodMap[method].revenue += order.total;

      if (!userStatsMap[userName]) userStatsMap[userName] = { name: userName, orderCount: 0, revenue: 0 };
      userStatsMap[userName].orderCount += 1;
      userStatsMap[userName].revenue += order.total;
    }

    return {
      ordersPerDay: Object.values(dailyStatsMap).sort((left, right) => left.date.localeCompare(right.date)),
      paymentMethodByOrders: Object.values(paymentMethodMap).sort((left, right) => right.revenue - left.revenue),
      topUsersByOrders: Object.values(userStatsMap)
        .sort((left, right) => right.orderCount - left.orderCount)
        .slice(0, 8),
    };
  }, [orders, reportsTranslations]);

  return { ordersPerDay, paymentMethodByOrders, topUsersByOrders };
}
