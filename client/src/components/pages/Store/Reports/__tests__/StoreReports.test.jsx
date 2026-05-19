import { render, screen, fireEvent } from "@testing-library/react";

import { StoreReports } from "../StoreReports";

const mockUseReports = jest.fn();

jest.mock("../hooks/useReports", () => ({
  useReports: (...args) => mockUseReports(...args),
}));

jest.mock("../Summary", () => ({
  ReportSkeleton: () => <div data-testid="report-skeleton" />,
  SummaryStat: ({ label, value }) => (
    <div data-testid="summary-stat">
      <span>{label}</span>
      <span data-testid="stat-value">{value}</span>
    </div>
  ),
}));

jest.mock("../Filters", () => ({
  DateRangeCard: ({ filters, onFiltersChange }) => (
    <div data-testid="date-range-card">
      <button
        data-testid="period-week-btn"
        onClick={() => onFiltersChange({ activePeriod: "week", startDate: "", endDate: "" })}
      >
        week
      </button>
      <span data-testid="active-period">{filters.activePeriod}</span>
    </div>
  ),
}));

jest.mock("../Sales", () => ({
  SalesList: ({ sales }) => (
    <div data-testid="sales-table">
      {sales.map((s, i) => (
        <span key={i} data-testid="sale-item">{s.productName}</span>
      ))}
    </div>
  ),
}));

jest.mock("../Charts", () => ({
  RevenueAreaChart: () => null,
  TopProductsBarChart: () => null,
  PaymentMethodPieChart: () => null,
}));

jest.mock("@heroui/react", () => {
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardHeader = ({ children }) => <div>{children}</div>;
  const CardBody = ({ children }) => <div>{children}</div>;
  const Pagination = () => null;
  return { Card, CardHeader, CardBody, Pagination };
});

const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

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
    error: null,
    filters: DEFAULT_FILTERS,
    currencyLoading: false,
    formatCurrency: (cents) => `$${cents}`,
    sales: [],
    paginatedSales: [],
    totalPages: 0,
    page: 1,
    setPage: jest.fn(),
    rowsPerPage: 10,
    totalRevenue: 0,
    totalItems: 0,
    revenueByDay: [],
    topProducts: [],
    paymentMethodSplit: [],
    handleFilters: jest.fn(),
    handleRowsPerPageChange: jest.fn(),
    exportToCsv: jest.fn(),
    ...overrides,
  };
}

describe("StoreReports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReports.mockReturnValue(makeHookReturn());
  });

  it("renders date range card", () => {
    render(<StoreReports />);
    expect(screen.getByTestId("date-range-card")).toBeInTheDocument();
  });

  it("shows report data when reportData is not null", () => {
    mockUseReports.mockReturnValue(
      makeHookReturn({ reportData: mockReport, paginatedSales: mockReport.sales, totalRevenue: 15000, totalItems: 7 }),
    );
    render(<StoreReports />);
    expect(screen.getByTestId("sales-table")).toBeInTheDocument();
    expect(screen.getAllByTestId("sale-item")).toHaveLength(2);
  });

  it("does not show SalesTable when reportData is null", () => {
    render(<StoreReports />);
    expect(screen.queryByTestId("sales-table")).not.toBeInTheDocument();
  });

  it("shows error banner when error is not null", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ error: new Error("fail") }));
    render(<StoreReports />);
    const redCards = document.querySelectorAll(".bg-red-50");
    expect(redCards.length).toBeGreaterThan(0);
  });

  it("shows skeleton when currencyLoading and no reportData", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ currencyLoading: true, reportData: null }));
    render(<StoreReports />);
    expect(screen.getByTestId("report-skeleton")).toBeInTheDocument();
  });

  it("does not show skeleton when reportData exists despite currencyLoading", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ currencyLoading: true, reportData: mockReport }));
    render(<StoreReports />);
    expect(screen.queryByTestId("report-skeleton")).not.toBeInTheDocument();
  });

  it("passes filters from hook to DateRangeCard", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ filters: { ...DEFAULT_FILTERS, activePeriod: "week" } }));
    render(<StoreReports />);
    expect(screen.getByTestId("active-period")).toHaveTextContent("week");
  });

  it("forwards filter changes to handleFilters from hook", () => {
    const mockHandleFilters = jest.fn();
    mockUseReports.mockReturnValue(makeHookReturn({ handleFilters: mockHandleFilters }));
    render(<StoreReports />);
    fireEvent.click(screen.getByTestId("period-week-btn"));
    expect(mockHandleFilters).toHaveBeenCalledWith(
      expect.objectContaining({ activePeriod: "week" }),
    );
  });

  describe("export CSV button", () => {
    const salesFixture = [
      { productName: "Widget A", quantity: 2, priceAtOrder: 1000, userName: "alice", paymentMethod: "Cash", saleDate: "2024-01-01" },
      { productName: "Widget B", quantity: 1, priceAtOrder: 3000, userName: "bob", paymentMethod: "BTC", saleDate: "2024-01-02" },
    ];

    it("renders the export button when sales exist", () => {
      mockUseReports.mockReturnValue(makeHookReturn({ reportData: mockReport, sales: salesFixture }));
      render(<StoreReports />);
      expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    });

    it("export button is disabled when there are no sales", () => {
      mockUseReports.mockReturnValue(makeHookReturn({ reportData: mockReport, sales: [] }));
      render(<StoreReports />);
      expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    });

    it("clicking export calls exportToCsv from hook", () => {
      const mockExportToCsv = jest.fn();
      mockUseReports.mockReturnValue(makeHookReturn({ reportData: mockReport, sales: salesFixture, exportToCsv: mockExportToCsv }));
      render(<StoreReports />);
      fireEvent.click(screen.getByRole("button", { name: /export/i }));
      expect(mockExportToCsv).toHaveBeenCalled();
    });
  });
});
