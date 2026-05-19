import { renderHook } from "@testing-library/react";

import { useChartData } from "../useChartData";

const salesData = [
  { productName: "A", quantity: 2, priceAtOrder: 1000, userName: "u1", paymentMethod: "Cash", saleDate: "2024-01-02T10:00:00" },
  { productName: "B", quantity: 1, priceAtOrder: 3000, userName: "u2", paymentMethod: "BTC", saleDate: "2024-01-01T09:00:00" },
  { productName: "A", quantity: 1, priceAtOrder: 1000, userName: "u1", paymentMethod: "Cash", saleDate: "2024-01-02T14:00:00" },
];

describe("useChartData", () => {
  it("revenueByDay groups sales by date and sums quantity * priceAtOrder", () => {
    const { result } = renderHook(() => useChartData(salesData));
    const jan2 = result.current.revenueByDay.find((d) => d.date === "2024-01-02");
    expect(jan2.revenue).toBe(3000); // 2*1000 + 1*1000
  });

  it("revenueByDay is sorted ascending by date", () => {
    const { result } = renderHook(() => useChartData(salesData));
    const dates = result.current.revenueByDay.map((d) => d.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("revenueByDay count tracks total quantity per day", () => {
    const { result } = renderHook(() => useChartData(salesData));
    const jan2 = result.current.revenueByDay.find((d) => d.date === "2024-01-02");
    expect(jan2.count).toBe(3); // quantity 2 + 1
  });

  it("topProducts sorts by revenue descending", () => {
    const { result } = renderHook(() => useChartData(salesData));
    const revenues = result.current.topProducts.map((p) => p.revenue);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
  });

  it("topProducts aggregates quantity across multiple sales of the same product", () => {
    const { result } = renderHook(() => useChartData(salesData));
    const productA = result.current.topProducts.find((p) => p.name === "A");
    expect(productA.quantity).toBe(3);
  });

  it("topProducts is capped at 8 entries", () => {
    const manySales = Array.from({ length: 10 }, (_, idx) => ({
      productName: `Product ${idx}`,
      quantity: 1,
      priceAtOrder: 1000 - idx * 10,
      userName: "u",
      paymentMethod: "Cash",
      saleDate: "2024-01-01T00:00:00",
    }));
    const { result } = renderHook(() => useChartData(manySales));
    expect(result.current.topProducts).toHaveLength(8);
  });

  it("paymentMethodSplit groups by paymentMethod and sorts by revenue descending", () => {
    const { result } = renderHook(() => useChartData(salesData));
    const [first] = result.current.paymentMethodSplit;
    expect(first.method).toBe("Cash");
    result.current.paymentMethodSplit.forEach((entry, idx, arr) => {
      if (idx > 0) expect(entry.revenue).toBeLessThanOrEqual(arr[idx - 1].revenue);
    });
  });

  it("paymentMethodSplit count tracks number of sale records per method", () => {
    const { result } = renderHook(() => useChartData(salesData));
    const cash = result.current.paymentMethodSplit.find((e) => e.method === "Cash");
    expect(cash.count).toBe(2);
  });

  it("returns empty arrays when sales is empty", () => {
    const { result } = renderHook(() => useChartData([]));
    expect(result.current.revenueByDay).toEqual([]);
    expect(result.current.topProducts).toEqual([]);
    expect(result.current.paymentMethodSplit).toEqual([]);
  });
});
