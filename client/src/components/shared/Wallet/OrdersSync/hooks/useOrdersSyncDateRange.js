"use client";
import { useState } from "react";

import { getLocalTimeZone, startOfWeek, today } from "@internationalized/date";

export function resolvePeriodDateRange(period) {
  const todayDate = today(getLocalTimeZone());
  switch (period) {
    case "day":
      return { start: todayDate, end: todayDate };
    case "week":
      return { start: startOfWeek(todayDate, "en-US", "mon"), end: todayDate };
    case "month":
      return { start: todayDate.set({ day: 1 }), end: todayDate };
    case "year":
      return { start: todayDate.set({ month: 1, day: 1 }), end: todayDate };
    default:
      throw new Error(`Invalid period: ${period}`);
  }
}

const DEFAULT_PERIOD = "month";

export function useOrdersSyncDateRange() {
  const [activePeriod, setActivePeriod] = useState(DEFAULT_PERIOD);
  const [dateRangeValue, setDateRangeValue] = useState(() => resolvePeriodDateRange(DEFAULT_PERIOD));

  const handlePeriodChange = (period) => {
    setActivePeriod(period);
    setDateRangeValue(resolvePeriodDateRange(period));
  };

  const handleDateRangeChange = (dateRangeValue) => {
    setActivePeriod(null);
    setDateRangeValue(dateRangeValue);
  };

  return { activePeriod, dateRangeValue, handlePeriodChange, handleDateRangeChange };
}
