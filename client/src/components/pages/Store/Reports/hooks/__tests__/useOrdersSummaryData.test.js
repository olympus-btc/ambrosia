import { renderHook } from "@testing-library/react";

import { useOrdersSummaryData } from "../useOrdersSummaryData";

const ORDERS = [
  { orderId: "o1" },
  { orderId: "o2" },
  { orderId: "o3" },
];

describe("useOrdersSummaryData", () => {
  it("returns all zeros when reportData is null and orders is empty", () => {
    const { result } = renderHook(() => useOrdersSummaryData(null, []));
    expect(result.current.totalRevenue).toBe(0);
    expect(result.current.orderCount).toBe(0);
    expect(result.current.averageTicket).toBe(0);
    expect(result.current.avgItemsPerOrder).toBe(0);
  });

  it("totalRevenue reads reportData.totalRevenueCents", () => {
    const { result } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 12000, totalItemsSold: 0 }, []));
    expect(result.current.totalRevenue).toBe(12000);
  });

  it("orderCount equals orders.length", () => {
    const { result } = renderHook(() => useOrdersSummaryData(null, ORDERS));
    expect(result.current.orderCount).toBe(3);
  });

  it("averageTicket is Math.round(revenue / orderCount)", () => {
    const { result } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 10000, totalItemsSold: 0 }, ORDERS));
    expect(result.current.averageTicket).toBe(Math.round(10000 / 3));
  });

  it("averageTicket is 0 when orderCount is 0", () => {
    const { result } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 5000, totalItemsSold: 10 }, []));
    expect(result.current.averageTicket).toBe(0);
  });

  it("avgItemsPerOrder is rounded to 1 decimal", () => {
    const { result } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 0, totalItemsSold: 10 }, ORDERS));
    expect(result.current.avgItemsPerOrder).toBe(Math.round((10 / 3) * 10) / 10);
  });

  it("avgItemsPerOrder is 0 when orderCount is 0", () => {
    const { result } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 0, totalItemsSold: 5 }, []));
    expect(result.current.avgItemsPerOrder).toBe(0);
  });

  it("avgItemsPerOrder falls back to 0 when totalItemsSold is undefined", () => {
    const { result } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 0 }, ORDERS));
    expect(result.current.avgItemsPerOrder).toBe(0);
  });
});
