import { renderHook } from "@testing-library/react";

import { useOrdersData } from "../useOrdersData";

const SALES_FIXTURE = [
  { orderId: "order-aaa-00000001", productName: "Widget A", quantity: 2, priceAtOrder: 1000, userName: "alice", paymentMethod: "Cash", saleDate: "2024-01-02T10:00:00" },
  { orderId: "order-aaa-00000001", productName: "Widget B", quantity: 1, priceAtOrder: 500, userName: "alice", paymentMethod: "Cash", saleDate: "2024-01-02T10:00:00" },
  { orderId: "order-bbb-00000002", productName: "Widget C", quantity: 3, priceAtOrder: 2000, userName: "bob", paymentMethod: "BTC", saleDate: "2024-01-01T08:00:00" },
];

describe("useOrdersData", () => {
  it("returns empty array for empty sales", () => {
    const { result } = renderHook(() => useOrdersData([]));
    expect(result.current).toEqual([]);
  });

  it("groups multiple line items from same order into one entry", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    expect(result.current).toHaveLength(2);
  });

  it("computes total as sum of quantity * priceAtOrder across all items", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    const orderA = result.current.find((order) => order.orderId === "order-aaa-00000001");
    expect(orderA.total).toBe(2 * 1000 + 1 * 500);
  });

  it("computes itemCount as sum of quantities across all items", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    const orderA = result.current.find((order) => order.orderId === "order-aaa-00000001");
    expect(orderA.itemCount).toBe(3);
  });

  it("collects all line items in items array", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    const orderA = result.current.find((order) => order.orderId === "order-aaa-00000001");
    expect(orderA.items).toHaveLength(2);
    expect(orderA.items[0].productName).toBe("Widget A");
    expect(orderA.items[1].productName).toBe("Widget B");
  });

  it("copies userName, paymentMethod, date from the first line item", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    const orderB = result.current.find((order) => order.orderId === "order-bbb-00000002");
    expect(orderB.userName).toBe("bob");
    expect(orderB.paymentMethod).toBe("BTC");
    expect(orderB.date).toBe("2024-01-01T08:00:00");
  });

  it("sets shortId as last 8 characters of orderId", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    const orderA = result.current.find((order) => order.orderId === "order-aaa-00000001");
    expect(orderA.shortId).toBe("00000001");
  });

  it("sorts orders by date descending (most recent first)", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    expect(result.current[0].orderId).toBe("order-aaa-00000001");
    expect(result.current[1].orderId).toBe("order-bbb-00000002");
  });

  it("single-item order has one item in items array", () => {
    const { result } = renderHook(() => useOrdersData(SALES_FIXTURE));
    const orderB = result.current.find((order) => order.orderId === "order-bbb-00000002");
    expect(orderB.items).toHaveLength(1);
    expect(orderB.total).toBe(3 * 2000);
  });
});
