import { act, renderHook } from "@testing-library/react";

import { defaultFilters, useDateRangeFilters, useFiltersState } from "../useFilters";

let mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch = jest.fn().mockResolvedValue({});
});

async function setupHook() {
  const hook = renderHook(() => useFiltersState(mockFetch));
  await act(async () => {});
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({});
  return hook;
}

describe("useFiltersState", () => {
  it("initial filters match defaultFilters", async () => {
    const { result } = renderHook(() => useFiltersState(mockFetch));
    await act(async () => {});
    expect(result.current.filters).toEqual(defaultFilters);
  });

  it("auto-fetches with default period on mount", async () => {
    renderHook(() => useFiltersState(mockFetch));
    await act(async () => {});
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ period: defaultFilters.activePeriod }),
    );
  });

  it("handleFilters with activePeriod fetches immediately", async () => {
    const { result } = await setupHook();

    await act(async () => {
      result.current.handleFilters({ activePeriod: "week", startDate: "", endDate: "" });
    });

    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ period: "week" }));
  });

  it("handleFilters with activePeriod updates filters state", async () => {
    const { result } = await setupHook();

    await act(async () => {
      result.current.handleFilters({ activePeriod: "year", startDate: "", endDate: "" });
    });

    expect(result.current.filters.activePeriod).toBe("year");
  });

  it("handleFilters with only startDate does not fetch", async () => {
    const { result } = await setupHook();

    act(() => {
      result.current.handleFilters({ startDate: "2024-01-01", activePeriod: null });
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handleFilters with only endDate does not fetch", async () => {
    const { result } = await setupHook();

    act(() => {
      result.current.handleFilters({ endDate: "2024-12-31", activePeriod: null });
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handleFilters fetches when both startDate and endDate are valid", async () => {
    const { result } = await setupHook();

    await act(async () => {
      result.current.handleFilters({ startDate: "2024-01-01", activePeriod: null });
    });
    await act(async () => {
      result.current.handleFilters({ endDate: "2024-01-31", activePeriod: null });
    });

    const calls = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((p) => p.startDate === "2024-01-01")).toBe(true);
    expect(calls.some((p) => p.endDate === "2024-01-31")).toBe(true);
  });

  it("handleFilters with paymentMethod fetches immediately", async () => {
    const { result } = await setupHook();

    await act(async () => {
      result.current.handleFilters({ paymentMethod: "Cash" });
    });

    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: "Cash" }));
  });

  it("handleFilters with productName debounces 500ms", async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useFiltersState(mockFetch));
    await act(async () => { jest.runAllTimers(); });
    jest.clearAllMocks();

    act(() => {
      result.current.handleFilters({ productName: "Widget" });
    });
    expect(mockFetch).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(500); });
    await act(async () => {});

    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ productName: "Widget" }));

    jest.useRealTimers();
  });
});

describe("useDateRangeFilters", () => {
  const baseFilters = { activePeriod: "", startDate: "", endDate: "", productName: "", paymentMethod: "" };

  it("activeFilterCount counts non-empty filter values", () => {
    const { result } = renderHook(() => useDateRangeFilters({ ...baseFilters, activePeriod: "month", productName: "cake" }, jest.fn()),
    );
    expect(result.current.activeFilterCount).toBe(2);
  });

  it("dateRangeValue is null when dates are missing", () => {
    const { result } = renderHook(() => useDateRangeFilters(baseFilters, jest.fn()));
    expect(result.current.dateRangeValue).toBeNull();
  });

  it("dateRangeValue returns CalendarDate objects when both dates are set", () => {
    const { result } = renderHook(() => useDateRangeFilters({ ...baseFilters, startDate: "2024-01-01", endDate: "2024-01-31" }, jest.fn()),
    );
    expect(result.current.dateRangeValue.start.toString()).toBe("2024-01-01");
    expect(result.current.dateRangeValue.end.toString()).toBe("2024-01-31");
  });

  it("handlePeriodChange calls onFiltersChange with period and clears dates", () => {
    const onFiltersChange = jest.fn();
    const { result } = renderHook(() => useDateRangeFilters(baseFilters, onFiltersChange));
    result.current.handlePeriodChange("week");
    expect(onFiltersChange).toHaveBeenCalledWith({ activePeriod: "week", startDate: "", endDate: "" });
  });

  it("handleDateRangeChange with a range calls onFiltersChange with stringified dates", () => {
    const onFiltersChange = jest.fn();
    const { result } = renderHook(() => useDateRangeFilters(baseFilters, onFiltersChange));
    result.current.handleDateRangeChange({
      start: { toString: () => "2024-03-01" },
      end: { toString: () => "2024-03-31" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ startDate: "2024-03-01", endDate: "2024-03-31", activePeriod: null });
  });

  it("handleDateRangeChange with null clears dates and activePeriod", () => {
    const onFiltersChange = jest.fn();
    const { result } = renderHook(() => useDateRangeFilters(baseFilters, onFiltersChange));
    result.current.handleDateRangeChange(null);
    expect(onFiltersChange).toHaveBeenCalledWith({ startDate: "", endDate: "", activePeriod: null });
  });

  it("handlePaymentMethod with 'all' calls onFiltersChange with empty string", () => {
    const onFiltersChange = jest.fn();
    const { result } = renderHook(() => useDateRangeFilters(baseFilters, onFiltersChange));
    result.current.handlePaymentMethod(new Set(["all"]));
    expect(onFiltersChange).toHaveBeenCalledWith({ paymentMethod: "" });
  });

  it("handlePaymentMethod with a specific method passes it through", () => {
    const onFiltersChange = jest.fn();
    const { result } = renderHook(() => useDateRangeFilters(baseFilters, onFiltersChange));
    result.current.handlePaymentMethod(new Set(["BTC"]));
    expect(onFiltersChange).toHaveBeenCalledWith({ paymentMethod: "BTC" });
  });
});
