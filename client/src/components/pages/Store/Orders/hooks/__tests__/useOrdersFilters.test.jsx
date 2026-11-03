import { act, renderHook } from "@testing-library/react";

import { useOrdersFilters } from "../useOrdersFilters";

let mockOrders = [];
let mockOrdersForbidden = false;
const mockFetchOrders = jest.fn();
const mockFetchOrdersFiltered = jest.fn();

jest.mock("../../../hooks/useOrders", () => ({
  useOrders: () => ({
    orders: mockOrders,
    forbidden: mockOrdersForbidden,
    fetchOrders: mockFetchOrders,
    fetchOrdersFiltered: mockFetchOrdersFiltered,
  }),
}));

describe("useOrdersFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrders = [
      { id: "order-1", userName: "Ana", tableId: "T1" },
      { id: "order-2", userName: "Luis", tableId: "T2" },
    ];
    mockOrdersForbidden = false;
  });

  it("exposes forbidden from useOrders", () => {
    mockOrdersForbidden = true;
    const { result } = renderHook(() => useOrdersFilters());

    expect(result.current.forbidden).toBe(true);
  });

  it("filters orders by search term across id, userName and tableId", () => {
    const { result } = renderHook(() => useOrdersFilters());

    act(() => result.current.search.onChange("luis"));

    expect(result.current.filteredOrders).toEqual([
      expect.objectContaining({ id: "order-2" }),
    ]);
  });

  it("paginates filtered orders based on rowsPerPage", () => {
    mockOrders = Array.from({ length: 15 }, (_, index) => ({ id: `order-${index}` }));
    const { result } = renderHook(() => useOrdersFilters());

    act(() => result.current.pagination.onChange("10"));

    expect(result.current.paginatedOrders).toHaveLength(10);
    expect(result.current.totalPages).toBe(2);
  });

  it("resets to page 1 when the search term changes", () => {
    mockOrders = Array.from({ length: 15 }, (_, index) => ({ id: `order-${index}` }));
    const { result } = renderHook(() => useOrdersFilters());

    act(() => result.current.pagination.onChange("10"));
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    act(() => result.current.search.onChange("order-1"));
    expect(result.current.page).toBe(1);
  });

  it("applies server filters and resets to page 1", async () => {
    mockFetchOrdersFiltered.mockResolvedValue([]);
    const { result } = renderHook(() => useOrdersFilters());

    act(() => result.current.onFiltersChange({ status: "paid" }));
    await act(async () => {
      await result.current.onApplyFilters();
    });

    expect(mockFetchOrdersFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    );
    expect(result.current.page).toBe(1);
  });

  it("clears filters back to defaults and refetches unfiltered orders", async () => {
    mockFetchOrders.mockResolvedValue([]);
    const { result } = renderHook(() => useOrdersFilters());

    act(() => result.current.onFiltersChange({ status: "paid" }));
    expect(result.current.filters.status).toBe("paid");

    await act(async () => {
      await result.current.onClearFilters();
    });

    expect(result.current.filters.status).toBeNull();
    expect(mockFetchOrders).toHaveBeenCalled();
  });
});
