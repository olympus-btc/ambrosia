"use client";
import { Card, CardBody } from "@heroui/react";

import { PaymentMethodPieChart } from "../Charts";
import { useShiftsChartData } from "../hooks/useShiftsChartData";

import { DifferenceOverTimeChart } from "./DifferenceOverTimeChart";

export function ShiftsAnalyticsCard({ shifts, byPaymentMethod, formatCurrency }) {
  const { differenceByDay, paymentMethodSplit } = useShiftsChartData(shifts, byPaymentMethod);

  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-8">
        <DifferenceOverTimeChart differenceByDay={differenceByDay} formatCurrency={formatCurrency} />
        <PaymentMethodPieChart paymentMethods={paymentMethodSplit} formatCurrency={formatCurrency} />
      </CardBody>
    </Card>
  );
}
