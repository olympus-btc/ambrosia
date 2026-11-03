import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useFreelanceReport } from "../useFreelanceReport";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const hookHandlers = {};

function FreelanceReportHookTestComponent() {
  const { report, loading, error: loadError, forbidden, fetchReport } = useFreelanceReport({ skipForbiddenRedirect: true });

  useEffect(() => {
    hookHandlers.fetchReport = fetchReport;
  }, [fetchReport]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="report-from">{report?.from ?? ""}</span>
      <span data-testid="error">{loadError ? "yes" : "no"}</span>
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
    </div>
  );
}

describe("useFreelanceReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads the billing report for a custom date range", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce({ from: "2026-08-17", to: "2026-08-23", currencies: [] });

    render(<FreelanceReportHookTestComponent />);
    await act(() => hookHandlers.fetchReport({ startDate: "2026-08-17", endDate: "2026-08-23" }));

    expect(httpClient).toHaveBeenCalledWith(
      "/freelance/billing-reports?from=2026-08-17&to=2026-08-23",
      { skipForbiddenRedirect: true },
    );
    expect(screen.getByTestId("report-from")).toHaveTextContent("2026-08-17");
    expect(screen.getByTestId("loading")).toHaveTextContent("no");
  });

  it("tracks forbidden report responses", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });

    render(<FreelanceReportHookTestComponent />);
    await act(() => hookHandlers.fetchReport({ period: "month" }));

    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");
    expect(parseJsonResponse).not.toHaveBeenCalled();
  });

  it("tracks report request failures", async () => {
    httpClient.mockRejectedValueOnce(new Error("Network error"));

    render(<FreelanceReportHookTestComponent />);
    await act(() => hookHandlers.fetchReport({ period: "week" }));

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("yes"));
  });

  it("skips the request without a complete date range", async () => {
    render(<FreelanceReportHookTestComponent />);
    await act(() => hookHandlers.fetchReport({ startDate: "2026-08-17" }));

    expect(httpClient).not.toHaveBeenCalled();
  });
});
