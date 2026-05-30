"use client";
import { Card, CardBody } from "@heroui/react";

import { useChartData } from "../hooks/useChartData";
import { useOrdersChartData } from "../hooks/useOrdersChartData";

import { OrdersAreaChart } from "./OrdersAreaChart";
import { RevenueAreaChart } from "./RevenueAreaChart";
import { TopUsersBarChart } from "./TopUsersBarChart";

export function OrdersAnalyticsCard({ sales, orders, formatCurrency }) {
  const { revenueByDay } = useChartData(sales);
  const { ordersPerDay, topUsersByOrders } = useOrdersChartData(orders);

  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-8">
        <RevenueAreaChart dailyRevenue={revenueByDay} formatCurrency={formatCurrency} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <OrdersAreaChart ordersPerDay={ordersPerDay} />
          <TopUsersBarChart users={topUsersByOrders} />
        </div>
      </CardBody>
    </Card>
  );
}
