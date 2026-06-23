import { act, renderHook } from "@testing-library/react";

import { useSalesData } from "../useSalesData";

jest.mock("@lib/formatDate", () => jest.fn((date) => date));

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
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  it("starts at page 1 with rowsPerPage 10", () => {
    const { result } = renderHook(() => useSalesData([], formatCurrency));
    expect(result.current.page).toBe(1);
    expect(result.current.rowsPerPage).toBe(10);
  });

  it("totalPages is ceil(sales.length / rowsPerPage)", () => {
    const { result } = renderHook(() => useSalesData(makeSales(25), formatCurrency));
    expect(result.current.totalPages).toBe(3);
  });

  it("paginatedSales returns first rowsPerPage items on page 1", () => {
    const sales = makeSales(15);
    const { result } = renderHook(() => useSalesData(sales, formatCurrency));
    expect(result.current.paginatedSales).toHaveLength(10);
    expect(result.current.paginatedSales[0].productName).toBe("Product 0");
  });

  it("paginatedSales returns correct slice when page changes", () => {
    const sales = makeSales(15);
    const { result } = renderHook(() => useSalesData(sales, formatCurrency));
    act(() => result.current.setPage(2));
    expect(result.current.paginatedSales).toHaveLength(5);
    expect(result.current.paginatedSales[0].productName).toBe("Product 10");
  });

  it("handleRowsPerPageChange updates rowsPerPage and resets page to 1", () => {
    const sales = makeSales(20);
    const { result } = renderHook(() => useSalesData(sales, formatCurrency));
    act(() => result.current.setPage(2));
    act(() => result.current.handleRowsPerPageChange(5));
    expect(result.current.rowsPerPage).toBe(5);
    expect(result.current.page).toBe(1);
  });

  it("resets page to 1 when sales reference changes", () => {
    const sales1 = makeSales(20);
    const sales2 = makeSales(20);
    const { result, rerender } = renderHook(
      ({ sales }) => useSalesData(sales, formatCurrency),
      { initialProps: { sales: sales1 } },
    );
    act(() => result.current.setPage(2));
    rerender({ sales: sales2 });
    expect(result.current.page).toBe(1);
  });

  it("exportToCsv with empty sales does not call URL.createObjectURL", () => {
    const { result } = renderHook(() => useSalesData([], formatCurrency));
    act(() => result.current.exportToCsv());
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("exportToCsv with sales calls URL.createObjectURL", () => {
    const { result } = renderHook(() => useSalesData(makeSales(1), formatCurrency));
    act(() => result.current.exportToCsv());
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("exportToCsv revokes the object URL after download", () => {
    const { result } = renderHook(() => useSalesData(makeSales(1), formatCurrency));
    act(() => result.current.exportToCsv());
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
