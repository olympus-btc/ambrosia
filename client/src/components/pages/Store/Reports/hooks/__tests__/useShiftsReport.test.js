import { act, renderHook } from "@testing-library/react";

import { getShiftsReport } from "@/services/shiftsService";

import { useShiftsReport } from "../useShiftsReport";

jest.mock("@/services/shiftsService", () => ({
  getShiftsReport: jest.fn(),
}));

const SHIFTS_REPORT_FIXTURE = {
  shifts: [],
  totalInitialAmount: 0,
  totalFinalAmount: 0,
  totalExpectedAmount: 0,
  totalDifference: 0,
  byPaymentMethod: [],
};

describe("useShiftsReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with no data, not loading, no error", () => {
    const { result: shiftsReportHook } = renderHook(() => useShiftsReport());
    expect(shiftsReportHook.current.shiftsReportData).toBeNull();
    expect(shiftsReportHook.current.loading).toBe(false);
    expect(shiftsReportHook.current.error).toBeNull();
  });

  it("sets shiftsReportData after a successful fetch", async () => {
    getShiftsReport.mockResolvedValue(SHIFTS_REPORT_FIXTURE);
    const { result: shiftsReportHook } = renderHook(() => useShiftsReport());

    await act(async () => {
      await shiftsReportHook.current.fetchShiftsReport({ period: "month" });
    });

    expect(getShiftsReport).toHaveBeenCalledWith({ period: "month" });
    expect(shiftsReportHook.current.shiftsReportData).toEqual(SHIFTS_REPORT_FIXTURE);
    expect(shiftsReportHook.current.loading).toBe(false);
  });

  it("sets error and re-throws when the fetch fails", async () => {
    const shiftsReportFetchError = new Error("Network error");
    getShiftsReport.mockRejectedValue(shiftsReportFetchError);
    const { result: shiftsReportHook } = renderHook(() => useShiftsReport());

    await act(async () => {
      await shiftsReportHook.current.fetchShiftsReport({ period: "month" }).catch(() => {});
    });

    expect(shiftsReportHook.current.error).toBe(shiftsReportFetchError);
    expect(shiftsReportHook.current.loading).toBe(false);
  });

  it("fetchShiftsReport re-throws the error for the caller to handle", async () => {
    getShiftsReport.mockRejectedValue(new Error("Network error"));
    const { result: shiftsReportHook } = renderHook(() => useShiftsReport());

    await expect(
      act(async () => shiftsReportHook.current.fetchShiftsReport({ period: "month" })),
    ).rejects.toThrow("Network error");
  });

  it("loading is true while the fetch is in flight", async () => {
    let resolveShiftsReportFetch;
    getShiftsReport.mockReturnValue(new Promise((resolve) => { resolveShiftsReportFetch = resolve; }));
    const { result: shiftsReportHook } = renderHook(() => useShiftsReport());

    act(() => {
      shiftsReportHook.current.fetchShiftsReport({ period: "month" });
    });
    expect(shiftsReportHook.current.loading).toBe(true);

    await act(async () => {
      resolveShiftsReportFetch(SHIFTS_REPORT_FIXTURE);
    });
    expect(shiftsReportHook.current.loading).toBe(false);
  });

  it("fetchShiftsReport returns the same value it stores in shiftsReportData", async () => {
    getShiftsReport.mockResolvedValue(SHIFTS_REPORT_FIXTURE);
    const { result: shiftsReportHook } = renderHook(() => useShiftsReport());

    let fetchedShiftsReport;
    await act(async () => {
      fetchedShiftsReport = await shiftsReportHook.current.fetchShiftsReport({ period: "month" });
    });

    expect(fetchedShiftsReport).toEqual(SHIFTS_REPORT_FIXTURE);
  });
});
