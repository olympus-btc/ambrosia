import { renderHook } from "@testing-library/react";

import { useSummaryData } from "../useSummaryData";

describe("useSummaryData", () => {
  it("totalRevenue is 0 when reportData is null", () => {
    const { result } = renderHook(() => useSummaryData(null));
    expect(result.current.totalRevenue).toBe(0);
  });

  it("totalItems is 0 when reportData is null", () => {
    const { result } = renderHook(() => useSummaryData(null));
    expect(result.current.totalItems).toBe(0);
  });

  it("totalRevenue derives from reportData.totalRevenueCents", () => {
    const { result } = renderHook(() => useSummaryData({ totalRevenueCents: 9900, totalItemsSold: 0, sales: [] }),
    );
    expect(result.current.totalRevenue).toBe(9900);
  });

  it("totalItems derives from reportData.totalItemsSold", () => {
    const { result } = renderHook(() => useSummaryData({ totalRevenueCents: 0, totalItemsSold: 42, sales: [] }),
    );
    expect(result.current.totalItems).toBe(42);
  });
});
