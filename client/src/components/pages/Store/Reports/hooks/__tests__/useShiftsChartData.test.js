import { renderHook } from "@testing-library/react";

import { useShiftsChartData } from "../useShiftsChartData";

describe("useShiftsChartData", () => {
  it("returns empty arrays when there is no data", () => {
    const { result: chartDataHook } = renderHook(() => useShiftsChartData([], []));
    expect(chartDataHook.current.differenceByDay).toEqual([]);
    expect(chartDataHook.current.paymentMethodSplit).toEqual([]);
  });

  it("sums differences per day and sorts by date ascending", () => {
    const shifts = [
      { shiftDate: "2024-01-02", difference: 5 },
      { shiftDate: "2024-01-01", difference: -3 },
      { shiftDate: "2024-01-01", difference: 2 },
    ];
    const { result: chartDataHook } = renderHook(() => useShiftsChartData(shifts, []));
    expect(chartDataHook.current.differenceByDay).toEqual([
      { date: "2024-01-01", difference: -1 },
      { date: "2024-01-02", difference: 5 },
    ]);
  });

  it("excludes shifts with a null difference (still open)", () => {
    const shifts = [
      { shiftDate: "2024-01-01", difference: null },
      { shiftDate: "2024-01-02", difference: 4 },
    ];
    const { result: chartDataHook } = renderHook(() => useShiftsChartData(shifts, []));
    expect(chartDataHook.current.differenceByDay).toEqual([{ date: "2024-01-02", difference: 4 }]);
  });

  it("maps byPaymentMethod entries into method/revenue pairs for the pie chart", () => {
    const byPaymentMethod = [{ name: "Efectivo", total: 80 }, { name: "BTC", total: 20 }];
    const { result: chartDataHook } = renderHook(() => useShiftsChartData([], byPaymentMethod));
    expect(chartDataHook.current.paymentMethodSplit).toEqual([
      { method: "Efectivo", revenue: 80 },
      { method: "BTC", revenue: 20 },
    ]);
  });
});
