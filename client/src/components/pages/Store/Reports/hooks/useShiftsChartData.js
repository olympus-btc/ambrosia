"use client";
import { useMemo } from "react";

export function useShiftsChartData(shifts, byPaymentMethod) {
  const differenceByDay = useMemo(() => {
    const dailyDifferenceMap = {};
    for (const shift of shifts) {
      if (shift.difference == null) continue;
      if (!dailyDifferenceMap[shift.shiftDate]) {
        dailyDifferenceMap[shift.shiftDate] = { date: shift.shiftDate, difference: 0 };
      }
      dailyDifferenceMap[shift.shiftDate].difference += shift.difference;
    }
    return Object.values(dailyDifferenceMap).sort((left, right) => left.date.localeCompare(right.date));
  }, [shifts]);

  const paymentMethodSplit = useMemo(
    () => byPaymentMethod.map(({ name, total }) => ({ method: name, revenue: total })),
    [byPaymentMethod],
  );

  return { differenceByDay, paymentMethodSplit };
}
