import { renderHook } from "@testing-library/react";

import { useSummaryData } from "../useSummaryData";

const SALES = [
  { productName: "A", quantity: 1, priceAtOrder: 1000 },
  { productName: "B", quantity: 2, priceAtOrder: 500 },
  { productName: "A", quantity: 1, priceAtOrder: 1000 },
];

describe("useSummaryData", () => {
  it("totalRevenue is 0 when reportData is null", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData(null));
    expect(summaryDataHook.current.totalRevenue).toBe(0);
  });

  it("totalItems is 0 when reportData is null", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData(null));
    expect(summaryDataHook.current.totalItems).toBe(0);
  });

  it("productLines is 0 when reportData is null", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData(null));
    expect(summaryDataHook.current.productLines).toBe(0);
  });

  it("uniqueProducts is 0 when reportData is null", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData(null));
    expect(summaryDataHook.current.uniqueProducts).toBe(0);
  });

  it("totalRevenue derives from reportData.totalRevenueCents", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData({ totalRevenueCents: 9900, totalItemsSold: 0, sales: [] }),
    );
    expect(summaryDataHook.current.totalRevenue).toBe(9900);
  });

  it("totalItems derives from reportData.totalItemsSold", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData({ totalRevenueCents: 0, totalItemsSold: 42, sales: [] }),
    );
    expect(summaryDataHook.current.totalItems).toBe(42);
  });

  it("productLines equals sales.length", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData({ totalRevenueCents: 0, totalItemsSold: 3, sales: SALES }));
    expect(summaryDataHook.current.productLines).toBe(3);
  });

  it("uniqueProducts counts distinct product names", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData({ totalRevenueCents: 0, totalItemsSold: 3, sales: SALES }));
    expect(summaryDataHook.current.uniqueProducts).toBe(2);
  });

  it("uniqueProducts is 0 when sales is empty", () => {
    const { result: summaryDataHook } = renderHook(() => useSummaryData({ totalRevenueCents: 5000, totalItemsSold: 0, sales: [] }));
    expect(summaryDataHook.current.uniqueProducts).toBe(0);
  });
});
