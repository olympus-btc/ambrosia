import { renderHook } from "@testing-library/react";

import { useOrdersSummaryData } from "../useOrdersSummaryData";

const ORDERS = [
  { orderId: "o1" },
  { orderId: "o2" },
  { orderId: "o3" },
];

describe("useOrdersSummaryData", () => {
  it("returns all zeros when reportData is null and orders is empty", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData(null, []));
    expect(ordersSummaryDataHook.current.totalRevenue).toBe(0);
    expect(ordersSummaryDataHook.current.orderCount).toBe(0);
    expect(ordersSummaryDataHook.current.averageTicket).toBe(0);
    expect(ordersSummaryDataHook.current.avgItemsPerOrder).toBe(0);
    expect(ordersSummaryDataHook.current.totalRefunded).toBe(0);
    expect(ordersSummaryDataHook.current.refundCount).toBe(0);
    expect(ordersSummaryDataHook.current.totalLightningFeeSat).toBe(0);
  });

  it("totalRefunded and refundCount read reportData.totalRefundedCents/refundCount", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalRefundedCents: 4500, refundCount: 3 }, []));
    expect(ordersSummaryDataHook.current.totalRefunded).toBe(4500);
    expect(ordersSummaryDataHook.current.refundCount).toBe(3);
  });

  it("totalLightningFeeSat reads reportData.totalLightningFeeSat", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalLightningFeeSat: 230 }, []));
    expect(ordersSummaryDataHook.current.totalLightningFeeSat).toBe(230);
  });

  it("totalRevenue reads reportData.totalRevenueCents", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 12000, totalItemsSold: 0 }, []));
    expect(ordersSummaryDataHook.current.totalRevenue).toBe(12000);
  });

  it("orderCount equals orders.length", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData(null, ORDERS));
    expect(ordersSummaryDataHook.current.orderCount).toBe(3);
  });

  it("averageTicket is Math.round(revenue / orderCount)", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 10000, totalItemsSold: 0 }, ORDERS));
    expect(ordersSummaryDataHook.current.averageTicket).toBe(Math.round(10000 / 3));
  });

  it("averageTicket is 0 when orderCount is 0", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 5000, totalItemsSold: 10 }, []));
    expect(ordersSummaryDataHook.current.averageTicket).toBe(0);
  });

  it("avgItemsPerOrder is rounded to 1 decimal", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 0, totalItemsSold: 10 }, ORDERS));
    expect(ordersSummaryDataHook.current.avgItemsPerOrder).toBe(Math.round((10 / 3) * 10) / 10);
  });

  it("avgItemsPerOrder is 0 when orderCount is 0", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 0, totalItemsSold: 5 }, []));
    expect(ordersSummaryDataHook.current.avgItemsPerOrder).toBe(0);
  });

  it("avgItemsPerOrder falls back to 0 when totalItemsSold is undefined", () => {
    const { result: ordersSummaryDataHook } = renderHook(() => useOrdersSummaryData({ totalRevenueCents: 0 }, ORDERS));
    expect(ordersSummaryDataHook.current.avgItemsPerOrder).toBe(0);
  });
});
