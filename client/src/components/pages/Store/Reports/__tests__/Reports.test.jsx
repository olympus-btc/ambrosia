import { addToast } from "@heroui/react";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";

import Reports from "../Reports";

const mockFetchReport = jest.fn();
const mockUseReports = jest.fn();

jest.mock("../hooks/useReports", () => ({
  useReports: (...args) => mockUseReports(...args),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (cents) => `$${cents}`,
    loading: false,
  }),
}));

jest.mock("../../StoreLayout", () => ({
  StoreLayout: ({ children }) => <div data-testid="store-layout">{children}</div>,
}));

jest.mock("../components/ReportsHeader", () => ({
  ReportsHeader: ({ onRefresh, loading }) => (
    <div>
      <button data-testid="refresh-btn" onClick={onRefresh}>refresh</button>
      {loading && <span data-testid="loading-indicator" />}
    </div>
  ),
}));

jest.mock("../components/ReportSkeleton", () => ({
  ReportSkeleton: () => <div data-testid="report-skeleton" />,
}));

jest.mock("../components/DateRangeCard", () => ({
  DateRangeCard: ({ filters, onFiltersChange }) => (
    <div data-testid="date-range-card">
      <button
        data-testid="period-week-btn"
        onClick={() => onFiltersChange({ activePeriod: "week", startDate: "", endDate: "" })}
      >
        week
      </button>
      <button
        data-testid="period-month-btn"
        onClick={() => onFiltersChange({ activePeriod: "month", startDate: "", endDate: "" })}
      >
        month
      </button>
      <input
        data-testid="start-date-input"
        value={filters.startDate}
        onChange={(e) => onFiltersChange({ startDate: e.target.value, activePeriod: null })}
      />
      <input
        data-testid="end-date-input"
        value={filters.endDate}
        onChange={(e) => onFiltersChange({ endDate: e.target.value, activePeriod: null })}
      />
      <input
        data-testid="product-name-input"
        value={filters.productName}
        onChange={(e) => onFiltersChange({ productName: e.target.value })}
      />
      <select
        data-testid="payment-method-select"
        value={filters.paymentMethod || "all"}
        onChange={(e) => onFiltersChange({ paymentMethod: e.target.value === "all" ? "" : e.target.value })}
      >
        <option value="all">All</option>
        <option value="efectivo">Efectivo</option>
        <option value="btc">Bitcoin</option>
        <option value="tarjeta de débito">Débito</option>
        <option value="tarjeta de crédito">Crédito</option>
      </select>
      <span data-testid="active-period">{filters.activePeriod}</span>
    </div>
  ),
}));

jest.mock("../components/SalesTable", () => ({
  SalesTable: ({ sales }) => (
    <div data-testid="sales-table">
      {sales.map((s, i) => (
        <span key={i} data-testid="sale-item">{s.productName}</span>
      ))}
    </div>
  ),
}));

jest.mock("../components/SummaryStat", () => ({
  SummaryStat: ({ label, value }) => (
    <div data-testid="summary-stat">
      <span>{label}</span>
      <span data-testid="stat-value">{value}</span>
    </div>
  ),
}));

jest.mock("@heroui/react", () => {
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardHeader = ({ children }) => <div>{children}</div>;
  const CardBody = ({ children }) => <div>{children}</div>;
  const addToast = jest.fn();
  return { Card, CardHeader, CardBody, addToast };
});

const mockReport = {
  totalRevenueCents: 15000,
  totalItemsSold: 7,
  sales: [
    { productName: "Widget A", quantity: 3, priceAtOrder: 1000, userName: "alice", paymentMethod: "Cash", saleDate: "2024-01-01" },
    { productName: "Widget B", quantity: 4, priceAtOrder: 3000, userName: "bob", paymentMethod: "BTC", saleDate: "2024-01-02" },
  ],
};

function makeHookReturn(overrides = {}) {
  return {
    reportData: null,
    loading: false,
    error: null,
    fetchReport: mockFetchReport,
    ...overrides,
  };
}

function renderReports() {
  return render(<Reports />);
}

describe("Reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchReport.mockResolvedValue(null);
    mockUseReports.mockReturnValue(makeHookReturn());
  });

  it("auto-generates the report on mount", async () => {
    renderReports();

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledTimes(1);
    });
  });

  it("auto-generates with period=month by default", async () => {
    renderReports();

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ period: "month" }),
      );
    });
  });

  it("does not auto-generate the report more than once on mount", async () => {
    renderReports();

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledTimes(1);
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetchReport).toHaveBeenCalledTimes(1);
  });

  it("renders the base layout without report data", async () => {
    renderReports();

    expect(screen.getByTestId("store-layout")).toBeInTheDocument();
    expect(screen.getByTestId("date-range-card")).toBeInTheDocument();
  });

  it("shows report data when reportData is not null", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ reportData: mockReport }));
    renderReports();

    expect(screen.getByTestId("sales-table")).toBeInTheDocument();
    expect(screen.getAllByTestId("sale-item")).toHaveLength(2);
  });

  it("does not show SalesTable when reportData is null", () => {
    renderReports();

    expect(screen.queryByTestId("sales-table")).not.toBeInTheDocument();
  });

  it("shows error toast when fetchReport throws an exception on refresh", async () => {
    mockFetchReport.mockResolvedValueOnce(null);
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    mockFetchReport.mockRejectedValueOnce(new Error("Network error"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-btn"));
    });

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger" }),
      );
    });
  });

  it("shows error banner when hook exposes error", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ error: new Error("fail") }));
    renderReports();

    const redCards = document.querySelectorAll(".bg-red-50");
    expect(redCards.length).toBeGreaterThan(0);
  });

  it("auto-generates when selecting week period", async () => {
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.click(screen.getByTestId("period-week-btn"));
    });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ period: "week" }),
      );
    });
  });

  it("period button clears dates and sets activePeriod", async () => {
    renderReports();

    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), { target: { value: "2024-01-01" } });
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("end-date-input"), { target: { value: "2024-01-31" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("period-week-btn"));
    });

    expect(screen.getByTestId("start-date-input").value).toBe("");
    expect(screen.getByTestId("end-date-input").value).toBe("");
    expect(screen.getByTestId("active-period")).toHaveTextContent("week");
  });

  it("auto-generates when a valid custom range is completed", async () => {
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), { target: { value: "2024-01-01" } });
    });

    expect(mockFetchReport).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(screen.getByTestId("end-date-input"), { target: { value: "2024-01-31" } });
    });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: "2024-01-01", endDate: "2024-01-31" }),
      );
    });
  });

  it("does not auto-generate when only startDate is provided", async () => {
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), { target: { value: "2024-01-01" } });
    });

    expect(mockFetchReport).not.toHaveBeenCalled();
  });

  it("does not auto-generate when only endDate is provided", async () => {
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("end-date-input"), { target: { value: "2024-12-31" } });
    });

    expect(mockFetchReport).not.toHaveBeenCalled();
  });

  it("does not generate report and shows error when startDate > endDate", async () => {
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), { target: { value: "2024-12-31" } });
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("end-date-input"), { target: { value: "2024-01-01" } });
    });

    expect(mockFetchReport).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger" }),
    );
  });

  it("auto-generates immediately when a payment method is selected", async () => {
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("payment-method-select"), { target: { value: "btc" } });
    });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethod: "btc" }),
      );
    });
  });

  it("sends paymentMethod undefined when selecting 'all'", async () => {
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("payment-method-select"), { target: { value: "all" } });
    });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethod: undefined }),
      );
    });
  });

  it("auto-generates with debounce when productName changes", async () => {
    jest.useFakeTimers();
    renderReports();
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    fireEvent.change(screen.getByTestId("product-name-input"), { target: { value: "Widget" } });
    expect(mockFetchReport).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(500); });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ productName: "Widget" }),
      );
    });

    jest.useRealTimers();
  });

  it("refresh button calls fetchReport again", async () => {
    mockFetchReport.mockResolvedValue(null);
    renderReports();

    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-btn"));
    });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledTimes(2);
    });
  });
});
