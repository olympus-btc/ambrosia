import { act, renderHook } from "@testing-library/react";

import { useOrdersDetailData } from "../useOrdersDetailData";

jest.mock("@lib/formatDate", () => jest.fn((date) => date));

const makeOrders = (count) => (
  Array.from({ length: count }, (_, i) => ({
    shortId: `SH${i}`,
    date: "2024-01-01",
    userName: "alice",
    paymentMethod: "Cash",
    total: 1000,
    itemCount: 1,
    items: [{ productName: `Product ${i}`, quantity: 1 }],
  }))
);

const formatCurrency = (cents) => `$${cents}`;

describe("useOrdersDetailData", () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  it("starts at page 1 with rowsPerPage 10", () => {
    const { result } = renderHook(() => useOrdersDetailData([], formatCurrency));
    expect(result.current.page).toBe(1);
    expect(result.current.rowsPerPage).toBe(10);
  });

  it("totalPages is ceil(orders.length / rowsPerPage)", () => {
    const { result } = renderHook(() => useOrdersDetailData(makeOrders(25), formatCurrency));
    expect(result.current.totalPages).toBe(3);
  });

  it("paginatedOrders returns first rowsPerPage items on page 1", () => {
    const orders = makeOrders(15);
    const { result } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    expect(result.current.paginatedOrders).toHaveLength(10);
    expect(result.current.paginatedOrders[0].shortId).toBe("SH0");
  });

  it("paginatedOrders returns correct slice when page changes", () => {
    const orders = makeOrders(15);
    const { result } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    act(() => result.current.setPage(2));
    expect(result.current.paginatedOrders).toHaveLength(5);
    expect(result.current.paginatedOrders[0].shortId).toBe("SH10");
  });

  it("handleRowsPerPageChange updates rowsPerPage and resets page to 1", () => {
    const orders = makeOrders(20);
    const { result } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    act(() => result.current.setPage(2));
    act(() => result.current.handleRowsPerPageChange(5));
    expect(result.current.rowsPerPage).toBe(5);
    expect(result.current.page).toBe(1);
  });

  it("resets page to 1 when orders reference changes", () => {
    const orders1 = makeOrders(20);
    const orders2 = makeOrders(20);
    const { result, rerender } = renderHook(
      ({ orders }) => useOrdersDetailData(orders, formatCurrency),
      { initialProps: { orders: orders1 } },
    );
    act(() => result.current.setPage(2));
    rerender({ orders: orders2 });
    expect(result.current.page).toBe(1);
  });

  it("exportToCsv with empty orders does not call URL.createObjectURL", () => {
    const { result } = renderHook(() => useOrdersDetailData([], formatCurrency));
    act(() => result.current.exportToCsv());
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("exportToCsv with orders calls URL.createObjectURL", () => {
    const { result } = renderHook(() => useOrdersDetailData(makeOrders(1), formatCurrency));
    act(() => result.current.exportToCsv());
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("exportToCsv revokes the object URL after download", () => {
    const { result } = renderHook(() => useOrdersDetailData(makeOrders(1), formatCurrency));
    act(() => result.current.exportToCsv());
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
