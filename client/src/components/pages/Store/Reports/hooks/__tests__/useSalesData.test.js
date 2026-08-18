import { act, renderHook } from "@testing-library/react";

import { useSalesData } from "../useSalesData";

jest.mock("@lib/formatDate", () => jest.fn((date) => date));

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  addToast: (...toastArguments) => mockAddToast(...toastArguments),
}));

const makeSales = (count) => (
  Array.from({ length: count }, (_, i) => ({
    productName: `Product ${i}`,
    userName: "alice",
    quantity: 1,
    priceAtOrder: 1000,
    paymentMethod: "Cash",
    saleDate: "2024-01-01",
  }))
);

const formatCurrency = (cents) => `$${cents}`;

describe("useSalesData", () => {
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
    const { result: salesDataHook } = renderHook(() => useSalesData([], formatCurrency));
    expect(salesDataHook.current.page).toBe(1);
    expect(salesDataHook.current.rowsPerPage).toBe(10);
  });

  it("totalPages is ceil(sales.length / rowsPerPage)", () => {
    const { result: salesDataHook } = renderHook(() => useSalesData(makeSales(25), formatCurrency));
    expect(salesDataHook.current.totalPages).toBe(3);
  });

  it("paginatedSales returns first rowsPerPage items on page 1", () => {
    const sales = makeSales(15);
    const { result: salesDataHook } = renderHook(() => useSalesData(sales, formatCurrency));
    expect(salesDataHook.current.paginatedSales).toHaveLength(10);
    expect(salesDataHook.current.paginatedSales[0].productName).toBe("Product 0");
  });

  it("paginatedSales returns correct slice when page changes", () => {
    const sales = makeSales(15);
    const { result: salesDataHook } = renderHook(() => useSalesData(sales, formatCurrency));
    act(() => salesDataHook.current.setPage(2));
    expect(salesDataHook.current.paginatedSales).toHaveLength(5);
    expect(salesDataHook.current.paginatedSales[0].productName).toBe("Product 10");
  });

  it("handleRowsPerPageChange updates rowsPerPage and resets page to 1", () => {
    const sales = makeSales(20);
    const { result: salesDataHook } = renderHook(() => useSalesData(sales, formatCurrency));
    act(() => salesDataHook.current.setPage(2));
    act(() => salesDataHook.current.handleRowsPerPageChange(5));
    expect(salesDataHook.current.rowsPerPage).toBe(5);
    expect(salesDataHook.current.page).toBe(1);
  });

  it("resets page to 1 when sales reference changes", () => {
    const sales1 = makeSales(20);
    const sales2 = makeSales(20);
    const { result: salesDataHook, rerender } = renderHook(
      ({ sales }) => useSalesData(sales, formatCurrency),
      { initialProps: { sales: sales1 } },
    );
    act(() => salesDataHook.current.setPage(2));
    rerender({ sales: sales2 });
    expect(salesDataHook.current.page).toBe(1);
  });

  it("exportToCsv with empty sales does not call URL.createObjectURL", () => {
    const { result: salesDataHook } = renderHook(() => useSalesData([], formatCurrency));
    act(() => salesDataHook.current.exportToCsv());
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("exportToCsv with sales calls URL.createObjectURL", () => {
    const { result: salesDataHook } = renderHook(() => useSalesData(makeSales(1), formatCurrency));
    act(() => salesDataHook.current.exportToCsv());
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("exportToCsv shows an error toast when CSV download creation fails", () => {
    global.URL.createObjectURL = jest.fn(() => {
      throw new Error("Blob URL failed");
    });
    const { result: salesDataHook } = renderHook(() => useSalesData(makeSales(1), formatCurrency));

    act(() => salesDataHook.current.exportToCsv());

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger", description: "export.error" }),
    );
  });

  it("exportToCsv revokes the object URL after download", () => {
    const { result: salesDataHook } = renderHook(() => useSalesData(makeSales(1), formatCurrency));
    act(() => salesDataHook.current.exportToCsv());
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("exportToCsv includes a status column with the row's status", () => {
    let capturedCsv;
    global.Blob = jest.fn((parts) => {
      capturedCsv = parts[0];
      return {};
    });
    const sales = [
      { productName: "Widget", userName: "alice", quantity: 1, priceAtOrder: 1000, paymentMethod: "Cash", saleDate: "2024-01-01", refunded: true },
      { productName: "Gadget", userName: "alice", quantity: 1, priceAtOrder: 2000, paymentMethod: "Cash", saleDate: "2024-01-01", refunded: false },
    ];
    const { result: salesDataHook } = renderHook(() => useSalesData(sales, formatCurrency));
    act(() => salesDataHook.current.exportToCsv());

    expect(capturedCsv).toContain("status.refunded");
    expect(capturedCsv).toContain("status.paid");
  });

  it("exportToCsv appends a summary section with revenue and refund totals", () => {
    let capturedCsv;
    global.Blob = jest.fn((parts) => {
      capturedCsv = parts[0];
      return {};
    });
    const sales = [
      { productName: "Widget", userName: "alice", quantity: 1, priceAtOrder: 1000, paymentMethod: "Cash", saleDate: "2024-01-01", refunded: true },
      { productName: "Gadget", userName: "alice", quantity: 1, priceAtOrder: 2000, paymentMethod: "Cash", saleDate: "2024-01-01", refunded: false },
    ];
    const { result: salesDataHook } = renderHook(() => useSalesData(sales, formatCurrency));
    act(() => salesDataHook.current.exportToCsv());

    expect(capturedCsv).toContain("summary.revenue");
    expect(capturedCsv).toContain("$3000");
    expect(capturedCsv).toContain("summary.netRevenue");
    expect(capturedCsv).toContain("$2000");
    expect(capturedCsv).toContain("summary.totalRefunded");
    expect(capturedCsv).toContain("$1000");
  });
});
