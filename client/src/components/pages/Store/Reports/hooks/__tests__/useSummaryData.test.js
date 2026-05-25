import { renderHook } from "@testing-library/react";

import { useSummaryData } from "../useSummaryData";

const SALES = [
  { productName: "A", quantity: 1, priceAtOrder: 1000 },
  { productName: "B", quantity: 2, priceAtOrder: 500 },
];

describe("useSummaryData", () => {
  it("totalRevenue is 0 when reportData is null", () => {
    const { result } = renderHook(() => useSummaryData(null));
    expect(result.current.totalRevenue).toBe(0);
  });

  it("totalItems is 0 when reportData is null", () => {
    const { result } = renderHook(() => useSummaryData(null));
    expect(result.current.totalItems).toBe(0);
  });

  it("transactionCount is 0 when reportData is null", () => {
    const { result } = renderHook(() => useSummaryData(null));
    expect(result.current.transactionCount).toBe(0);
  });

  it("avgTicket is 0 when reportData is null", () => {
    const { result } = renderHook(() => useSummaryData(null));
    expect(result.current.avgTicket).toBe(0);
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

  it("transactionCount equals sales.length", () => {
    const { result } = renderHook(() =>
      useSummaryData({ totalRevenueCents: 0, totalItemsSold: 3, sales: SALES }),
    );
    expect(result.current.transactionCount).toBe(2);
  });

  it("avgTicket is 0 when there are no sales", () => {
    const { result } = renderHook(() =>
      useSummaryData({ totalRevenueCents: 5000, totalItemsSold: 5, sales: [] }),
    );
    expect(result.current.avgTicket).toBe(0);
  });

  it("avgTicket is round(totalRevenueCents / sales.length)", () => {
    const { result } = renderHook(() =>
      useSummaryData({ totalRevenueCents: 1000, totalItemsSold: 3, sales: SALES }),
    );
    expect(result.current.avgTicket).toBe(500);
  });
});
