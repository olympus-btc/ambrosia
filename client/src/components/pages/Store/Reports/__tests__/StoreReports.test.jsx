import { render, screen, fireEvent } from "@testing-library/react";

import { StoreReports } from "../StoreReports";

const mockHandleFiltersChange = jest.fn();
const mockUseReports = jest.fn();
const mockUseCurrency = jest.fn();

jest.mock("../hooks/useReports", () => ({
  useReports: (...args) => mockUseReports(...args),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: (...args) => mockUseCurrency(...args),
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
    totalRevenue: 0,
    totalItems: 0,
    handleFiltersChange: mockHandleFiltersChange,
    ...overrides,
  };
}

describe("StoreReports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReports.mockReturnValue(makeHookReturn());
    mockUseCurrency.mockReturnValue({ formatAmount: (cents) => `$${cents}`, loading: false });
  });

  it("renders date range card", () => {
    render(<StoreReports />);
    expect(screen.getByTestId("date-range-card")).toBeInTheDocument();
  });

  it("shows report data when reportData is not null", () => {
    mockUseReports.mockReturnValue(
      makeHookReturn({ reportData: mockReport, totalRevenue: 15000, totalItems: 7 }),
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
    mockUseCurrency.mockReturnValue({ formatAmount: (c) => `$${c}`, loading: true });
    mockUseReports.mockReturnValue(makeHookReturn({ reportData: null }));
    render(<StoreReports />);
    expect(screen.getByTestId("report-skeleton")).toBeInTheDocument();
  });

  it("does not show skeleton when reportData exists despite currencyLoading", () => {
    mockUseCurrency.mockReturnValue({ formatAmount: (c) => `$${c}`, loading: true });
    mockUseReports.mockReturnValue(makeHookReturn({ reportData: mockReport }));
    render(<StoreReports />);
    expect(screen.queryByTestId("report-skeleton")).not.toBeInTheDocument();
  });

  it("passes filters from hook to DateRangeCard", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ filters: { ...DEFAULT_FILTERS, activePeriod: "week" } }));
    render(<StoreReports />);
    expect(screen.getByTestId("active-period")).toHaveTextContent("week");
  });

  it("forwards filter changes to handleFiltersChange from hook", () => {
    render(<StoreReports />);
    fireEvent.click(screen.getByTestId("period-week-btn"));
    expect(mockHandleFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ activePeriod: "week" }),
    );
  });
});
