import { renderHook } from "@testing-library/react";

import { useOrdersChartData } from "../useOrdersChartData";

jest.mock("@lib/formatDate", () => ({
  formatDateParts: (dateString) => {
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) return { localDay: "", date: "-", time: "" };
    return {
      localDay: parsedDate.toISOString().slice(0, 10),
      date: parsedDate.toLocaleDateString(),
      time: parsedDate.toLocaleTimeString(),
    };
  },
}));

const ORDERS_FIXTURE = [
  { orderId: "order-001", date: "2024-01-02T10:00:00", userName: "alice", paymentMethod: "Cash", total: 2500 },
  { orderId: "order-002", date: "2024-01-02T12:00:00", userName: "bob", paymentMethod: "BTC", total: 4000 },
  { orderId: "order-003", date: "2024-01-03T09:00:00", userName: "alice", paymentMethod: "Cash", total: 1500 },
  { orderId: "order-004", date: "2024-01-03T11:00:00", userName: "alice", paymentMethod: "BTC", total: 3000 },
  { orderId: "order-005", date: "2024-01-03T14:00:00", userName: "bob", paymentMethod: "Cash", total: 2000 },
];

describe("useOrdersChartData", () => {
  describe("ordersPerDay", () => {
    it("returns empty array for empty orders", () => {
      const { result } = renderHook(() => useOrdersChartData([]));
      expect(result.current.ordersPerDay).toEqual([]);
    });

    it("groups orders by day", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      expect(result.current.ordersPerDay).toHaveLength(2);
    });

    it("counts orders correctly per day", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      const day2 = result.current.ordersPerDay.find((dayEntry) => dayEntry.date === "2024-01-02");
      const day3 = result.current.ordersPerDay.find((dayEntry) => dayEntry.date === "2024-01-03");
      expect(day2.orders).toBe(2);
      expect(day3.orders).toBe(3);
    });

    it("accumulates revenue correctly per day", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      const day2 = result.current.ordersPerDay.find((dayEntry) => dayEntry.date === "2024-01-02");
      expect(day2.revenue).toBe(6500);
    });

    it("sorts days ascending", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      const dates = result.current.ordersPerDay.map((dayEntry) => dayEntry.date);
      expect(dates).toEqual(["2024-01-02", "2024-01-03"]);
    });
  });

  describe("paymentMethodByOrders", () => {
    it("returns empty array for empty orders", () => {
      const { result } = renderHook(() => useOrdersChartData([]));
      expect(result.current.paymentMethodByOrders).toEqual([]);
    });

    it("groups orders by payment method", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      expect(result.current.paymentMethodByOrders).toHaveLength(2);
    });

    it("counts correctly per payment method", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      const cash = result.current.paymentMethodByOrders.find((m) => m.method === "Cash");
      const btc = result.current.paymentMethodByOrders.find((m) => m.method === "BTC");
      expect(cash.count).toBe(3);
      expect(btc.count).toBe(2);
    });
  });

  describe("topUsersByOrders", () => {
    it("returns empty array for empty orders", () => {
      const { result } = renderHook(() => useOrdersChartData([]));
      expect(result.current.topUsersByOrders).toEqual([]);
    });

    it("groups orders by user correctly", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      expect(result.current.topUsersByOrders).toHaveLength(2);
    });

    it("counts order count per user", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      const alice = result.current.topUsersByOrders.find((u) => u.name === "alice");
      const bob = result.current.topUsersByOrders.find((u) => u.name === "bob");
      expect(alice.orderCount).toBe(3);
      expect(bob.orderCount).toBe(2);
    });

    it("accumulates revenue per user", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      const alice = result.current.topUsersByOrders.find((u) => u.name === "alice");
      expect(alice.revenue).toBe(7000);
    });

    it("sorts users by orderCount descending", () => {
      const { result } = renderHook(() => useOrdersChartData(ORDERS_FIXTURE));
      expect(result.current.topUsersByOrders[0].name).toBe("alice");
      expect(result.current.topUsersByOrders[1].name).toBe("bob");
    });

    it("uses 'Unknown' as fallback for null userName", () => {
      const ordersWithNullUser = [
        { orderId: "order-x", date: "2024-01-02T10:00:00", userName: null, paymentMethod: "Cash", total: 1000 },
      ];
      const { result } = renderHook(() => useOrdersChartData(ordersWithNullUser));
      expect(result.current.topUsersByOrders[0].name).toBe("Unknown");
    });

    it("uses 'Unknown' as fallback for empty string userName", () => {
      const ordersWithEmptyUser = [
        { orderId: "order-y", date: "2024-01-02T10:00:00", userName: "", paymentMethod: "Cash", total: 1000 },
      ];
      const { result } = renderHook(() => useOrdersChartData(ordersWithEmptyUser));
      expect(result.current.topUsersByOrders[0].name).toBe("Unknown");
    });

    it("limits results to 8 users", () => {
      const manyUserOrders = Array.from({ length: 10 }, (_, i) => ({
        orderId: `order-${i}`,
        date: "2024-01-02T10:00:00",
        userName: `user${i}`,
        paymentMethod: "Cash",
        total: 1000,
      }));
      const { result } = renderHook(() => useOrdersChartData(manyUserOrders));
      expect(result.current.topUsersByOrders).toHaveLength(8);
    });
  });
});
