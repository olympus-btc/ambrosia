import { getDayOfWeek, getLocalTimeZone, today } from "@internationalized/date";
import { act, renderHook } from "@testing-library/react";

import { resolvePeriodDateRange, useOrdersSyncDateRange } from "../useOrdersSyncDateRange";

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-03-18T12:00:00"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("resolvePeriodDateRange", () => {
  it("resolves day as a single-day range of today", () => {
    const todayDate = today(getLocalTimeZone());

    const dateRange = resolvePeriodDateRange("day");

    expect(dateRange.start.compare(todayDate)).toBe(0);
    expect(dateRange.end.compare(todayDate)).toBe(0);
  });

  it("resolves week as this week's Monday through today", () => {
    const todayDate = today(getLocalTimeZone());

    const dateRange = resolvePeriodDateRange("week");

    expect(getDayOfWeek(dateRange.start, "en-US", "mon")).toBe(0);
    expect(dateRange.start.compare(todayDate)).toBeLessThanOrEqual(0);
    expect(dateRange.end.compare(todayDate)).toBe(0);
  });

  it("resolves month as the first day of this month through today", () => {
    const todayDate = today(getLocalTimeZone());

    const dateRange = resolvePeriodDateRange("month");

    expect(dateRange.start.day).toBe(1);
    expect(dateRange.start.month).toBe(todayDate.month);
    expect(dateRange.start.year).toBe(todayDate.year);
    expect(dateRange.end.compare(todayDate)).toBe(0);
  });

  it("resolves year as the first day of this year through today", () => {
    const todayDate = today(getLocalTimeZone());

    const dateRange = resolvePeriodDateRange("year");

    expect(dateRange.start.day).toBe(1);
    expect(dateRange.start.month).toBe(1);
    expect(dateRange.start.year).toBe(todayDate.year);
    expect(dateRange.end.compare(todayDate)).toBe(0);
  });

  it("throws for an unknown period", () => {
    expect(() => resolvePeriodDateRange("decade")).toThrow("Invalid period: decade");
  });
});

describe("useOrdersSyncDateRange", () => {
  it("starts with month as the active period and its resolved range", () => {
    const { result: dateRangeState } = renderHook(() => useOrdersSyncDateRange());

    expect(dateRangeState.current.activePeriod).toBe("month");
    expect(dateRangeState.current.dateRangeValue).toEqual(resolvePeriodDateRange("month"));
  });

  it("updates the active period and range when a period is selected", () => {
    const { result: dateRangeState } = renderHook(() => useOrdersSyncDateRange());

    act(() => {
      dateRangeState.current.handlePeriodChange("week");
    });

    expect(dateRangeState.current.activePeriod).toBe("week");
    expect(dateRangeState.current.dateRangeValue).toEqual(resolvePeriodDateRange("week"));
  });

  it("clears the active period when a custom date range is chosen", () => {
    const { result: dateRangeState } = renderHook(() => useOrdersSyncDateRange());
    const customDateRange = {
      start: today(getLocalTimeZone()).subtract({ days: 10 }),
      end: today(getLocalTimeZone()),
    };

    act(() => {
      dateRangeState.current.handleDateRangeChange(customDateRange);
    });

    expect(dateRangeState.current.activePeriod).toBeNull();
    expect(dateRangeState.current.dateRangeValue).toEqual(customDateRange);
  });
});
