"use client";
import { Card, CardBody } from "@heroui/react";

import { useChartData } from "../hooks/useChartData";

import { PaymentMethodPieChart } from "./PaymentMethodPieChart";
import { RevenueAreaChart } from "./RevenueAreaChart";
import { TopProductsBarChart } from "./TopProductsBarChart";

export function AnalyticsCard({ sales, formatCurrency }) {
  const { revenueByDay, topProducts, paymentMethodSplit } = useChartData(sales);
  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-8">
        <RevenueAreaChart dailyRevenue={revenueByDay} formatCurrency={formatCurrency} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <TopProductsBarChart products={topProducts} formatCurrency={formatCurrency} />
          <PaymentMethodPieChart paymentMethods={paymentMethodSplit} formatCurrency={formatCurrency} />
        </div>
      </CardBody>
    </Card>
  );
}
