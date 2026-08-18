import { act, renderHook } from "@testing-library/react";

import { useOrdersDetailData } from "../useOrdersDetailData";

jest.mock("@lib/formatDate", () => jest.fn((date) => date));

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  addToast: (...toastArguments) => mockAddToast(...toastArguments),
}));

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
  const OriginalBlob = global.Blob;

  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    global.Blob = OriginalBlob;
  });

  it("starts at page 1 with rowsPerPage 10", () => {
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData([], formatCurrency));
    expect(ordersDetailDataHook.current.page).toBe(1);
    expect(ordersDetailDataHook.current.rowsPerPage).toBe(10);
  });

  it("totalPages is ceil(orders.length / rowsPerPage)", () => {
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(makeOrders(25), formatCurrency));
    expect(ordersDetailDataHook.current.totalPages).toBe(3);
  });

  it("paginatedOrders returns first rowsPerPage items on page 1", () => {
    const orders = makeOrders(15);
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    expect(ordersDetailDataHook.current.paginatedOrders).toHaveLength(10);
    expect(ordersDetailDataHook.current.paginatedOrders[0].shortId).toBe("SH0");
  });

  it("paginatedOrders returns correct slice when page changes", () => {
    const orders = makeOrders(15);
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    act(() => ordersDetailDataHook.current.setPage(2));
    expect(ordersDetailDataHook.current.paginatedOrders).toHaveLength(5);
    expect(ordersDetailDataHook.current.paginatedOrders[0].shortId).toBe("SH10");
  });

  it("handleRowsPerPageChange updates rowsPerPage and resets page to 1", () => {
    const orders = makeOrders(20);
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    act(() => ordersDetailDataHook.current.setPage(2));
    act(() => ordersDetailDataHook.current.handleRowsPerPageChange(5));
    expect(ordersDetailDataHook.current.rowsPerPage).toBe(5);
    expect(ordersDetailDataHook.current.page).toBe(1);
  });

  it("resets page to 1 when orders reference changes", () => {
    const orders1 = makeOrders(20);
    const orders2 = makeOrders(20);
    const { result: ordersDetailDataHook, rerender } = renderHook(
      ({ orders }) => useOrdersDetailData(orders, formatCurrency),
      { initialProps: { orders: orders1 } },
    );
    act(() => ordersDetailDataHook.current.setPage(2));
    rerender({ orders: orders2 });
    expect(ordersDetailDataHook.current.page).toBe(1);
  });

  it("exportToCsv with empty orders does not call URL.createObjectURL", () => {
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData([], formatCurrency));
    act(() => ordersDetailDataHook.current.exportToCsv());
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("exportToCsv with orders calls URL.createObjectURL", () => {
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(makeOrders(1), formatCurrency));
    act(() => ordersDetailDataHook.current.exportToCsv());
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("exportToCsv shows an error toast when CSV download creation fails", () => {
    global.URL.createObjectURL = jest.fn(() => {
      throw new Error("Blob URL failed");
    });
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(makeOrders(1), formatCurrency));

    act(() => ordersDetailDataHook.current.exportToCsv());

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger", description: "export.error" }),
    );
  });

  it("exportToCsv revokes the object URL after download", () => {
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(makeOrders(1), formatCurrency));
    act(() => ordersDetailDataHook.current.exportToCsv());
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("exportToCsv includes a status column with the row's status", () => {
    let capturedCsv;
    global.Blob = jest.fn((parts) => {
      capturedCsv = parts[0];
      return {};
    });
    const orders = [
      { shortId: "SH0", date: "2024-01-01", userName: "alice", paymentMethod: "Cash", total: 1000, itemCount: 1, items: [{ productName: "Widget", quantity: 1 }], refunded: true },
      { shortId: "SH1", date: "2024-01-01", userName: "alice", paymentMethod: "Cash", total: 2000, itemCount: 1, items: [{ productName: "Gadget", quantity: 1 }], refunded: false },
    ];
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    act(() => ordersDetailDataHook.current.exportToCsv());

    expect(capturedCsv).toContain("status.refunded");
    expect(capturedCsv).toContain("status.paid");
  });

  it("exportToCsv appends a summary section with revenue and refund totals", () => {
    let capturedCsv;
    global.Blob = jest.fn((parts) => {
      capturedCsv = parts[0];
      return {};
    });
    const orders = [
      { shortId: "SH0", date: "2024-01-01", userName: "alice", paymentMethod: "Cash", total: 1000, itemCount: 1, items: [{ productName: "Widget", quantity: 1 }], refunded: true },
      { shortId: "SH1", date: "2024-01-01", userName: "alice", paymentMethod: "Cash", total: 2000, itemCount: 1, items: [{ productName: "Gadget", quantity: 1 }], refunded: false },
    ];
    const { result: ordersDetailDataHook } = renderHook(() => useOrdersDetailData(orders, formatCurrency));
    act(() => ordersDetailDataHook.current.exportToCsv());

    expect(capturedCsv).toContain("summary.revenue");
    expect(capturedCsv).toContain("$3000");
    expect(capturedCsv).toContain("summary.netRevenue");
    expect(capturedCsv).toContain("$2000");
    expect(capturedCsv).toContain("summary.totalRefunded");
    expect(capturedCsv).toContain("$1000");
  });
});
