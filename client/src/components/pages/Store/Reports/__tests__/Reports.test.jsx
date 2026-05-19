import { render, screen, fireEvent } from "@testing-library/react";

import Reports from "../Reports";

// ── hooks ────────────────────────────────────────────────────────────────────

const mockFetchReport = jest.fn();
const mockHandleFilters = jest.fn();

jest.mock("../hooks/useReports", () => ({
  useReports: () => mockUseReports(),
}));

jest.mock("../hooks/useFilters", () => ({
  useFiltersState: () => mockUseFiltersState(),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => mockUseCurrency(),
}));

// ── child components ─────────────────────────────────────────────────────────

jest.mock("../Filters", () => ({
  FiltersCard: ({ filters, onFiltersChange, disabled }) => (
    <div data-testid="filters-card" data-disabled={String(disabled)}>
      <button
        data-testid="change-filters-btn"
        onClick={() => onFiltersChange({ activePeriod: "week" })}
      >
        change
      </button>
      <span data-testid="active-period">{filters.activePeriod}</span>
    </div>
  ),
}));

jest.mock("../Charts", () => ({
  AnalyticsCard: ({ sales }) => (
    <div data-testid="analytics-card">
      {sales.map((s, i) => (
        <span key={i} data-testid="chart-sale">{s.productName}</span>
      ))}
    </div>
  ),
}));

jest.mock("../Sales", () => ({
  SalesDetailCard: ({ sales }) => (
    <div data-testid="sales-detail-card">
      {sales.map((s, i) => (
        <span key={i} data-testid="sale-item">{s.productName}</span>
      ))}
    </div>
  ),
}));

jest.mock("../Summary", () => ({
  ReportSkeleton: () => <div data-testid="report-skeleton" />,
  SummaryCard: () => <div data-testid="summary-card" />,
}));

jest.mock("@components/shared/PageHeader", () => ({
  PageHeader: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <span>{title}</span>
      <span>{subtitle}</span>
    </div>
  ),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

jest.mock("lucide-react", () => ({
  AlertCircle: (props) => <svg {...props} data-testid="alert-icon" />,
}));

// ── test data ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

const SALES_FIXTURE = [
  { productName: "Widget A", quantity: 2, priceAtOrder: 1000, userName: "alice", paymentMethod: "Cash", saleDate: "2024-01-01" },
  { productName: "Widget B", quantity: 1, priceAtOrder: 3000, userName: "bob", paymentMethod: "BTC", saleDate: "2024-01-02" },
];

const REPORT_FIXTURE = {
  totalRevenueCents: 5000,
  totalItemsSold: 3,
  sales: SALES_FIXTURE,
};

// ── mock factories ────────────────────────────────────────────────────────────

function makeUseReports(overrides = {}) {
  return {
    fetchReport: mockFetchReport,
    reportData: null,
    error: null,
    ...overrides,
  };
}

function makeUseFiltersState(overrides = {}) {
  return {
    filters: DEFAULT_FILTERS,
    handleFilters: mockHandleFilters,
    ...overrides,
  };
}

function makeUseCurrency(overrides = {}) {
  return {
    formatAmount: (cents) => `$${cents}`,
    loading: false,
    ...overrides,
  };
}

let mockUseReports;
let mockUseFiltersState;
let mockUseCurrency;

// ── suite ─────────────────────────────────────────────────────────────────────

describe("Reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReports = () => makeUseReports();
    mockUseFiltersState = () => makeUseFiltersState();
    mockUseCurrency = () => makeUseCurrency();
  });

  describe("skeleton", () => {
    it("shows skeleton when currencyLoading and reportData is null", () => {
      mockUseCurrency = () => makeUseCurrency({ loading: true });
      render(<Reports />);
      expect(screen.getByTestId("report-skeleton")).toBeInTheDocument();
    });

    it("does not show skeleton when reportData exists despite currencyLoading", () => {
      mockUseCurrency = () => makeUseCurrency({ loading: true });
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.queryByTestId("report-skeleton")).not.toBeInTheDocument();
    });

    it("does not show skeleton when currency is not loading", () => {
      render(<Reports />);
      expect(screen.queryByTestId("report-skeleton")).not.toBeInTheDocument();
    });
  });

  describe("page header", () => {
    it("renders the main page header", () => {
      render(<Reports />);
      const headers = screen.getAllByTestId("page-header");
      expect(headers.length).toBeGreaterThan(0);
    });

    it("header shows the i18n title and subtitle", () => {
      render(<Reports />);
      expect(screen.getByText("header.title")).toBeInTheDocument();
      expect(screen.getByText("header.subtitle")).toBeInTheDocument();
    });
  });

  describe("error banner", () => {
    it("shows error banner when error is set", () => {
      mockUseReports = () => makeUseReports({ error: new Error("fail") });
      render(<Reports />);
      const redCard = document.querySelector(".bg-red-50");
      expect(redCard).toBeInTheDocument();
    });

    it("shows error icon inside the banner", () => {
      mockUseReports = () => makeUseReports({ error: new Error("fail") });
      render(<Reports />);
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });

    it("does not show error banner when there is no error", () => {
      render(<Reports />);
      expect(document.querySelector(".bg-red-50")).not.toBeInTheDocument();
    });
  });

  describe("FiltersCard", () => {
    it("always renders FiltersCard", () => {
      render(<Reports />);
      expect(screen.getByTestId("filters-card")).toBeInTheDocument();
    });

    it("passes current filters to FiltersCard", () => {
      mockUseFiltersState = () => makeUseFiltersState({ filters: { ...DEFAULT_FILTERS, activePeriod: "week" } });
      render(<Reports />);
      expect(screen.getByTestId("active-period")).toHaveTextContent("week");
    });

    it("passes disabled=true to FiltersCard when currency is loading", () => {
      mockUseCurrency = () => makeUseCurrency({ loading: true, formatAmount: (c) => `$${c}` });
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByTestId("filters-card")).toHaveAttribute("data-disabled", "true");
    });

    it("forwards filter changes to handleFilters", () => {
      render(<Reports />);
      fireEvent.click(screen.getByTestId("change-filters-btn"));
      expect(mockHandleFilters).toHaveBeenCalledWith(expect.objectContaining({ activePeriod: "week" }));
    });
  });

  describe("charts section", () => {
    it("renders AnalyticsCard when reportData has sales", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByTestId("analytics-card")).toBeInTheDocument();
    });

    it("renders charts section header when reportData has sales", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByText("charts.title")).toBeInTheDocument();
    });

    it("does not render AnalyticsCard when sales list is empty", () => {
      mockUseReports = () => makeUseReports({ reportData: { ...REPORT_FIXTURE, sales: [] } });
      render(<Reports />);
      expect(screen.queryByTestId("analytics-card")).not.toBeInTheDocument();
    });

    it("does not render AnalyticsCard when reportData is null", () => {
      render(<Reports />);
      expect(screen.queryByTestId("analytics-card")).not.toBeInTheDocument();
    });

    it("passes sales to AnalyticsCard", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      const items = screen.getAllByTestId("chart-sale");
      expect(items).toHaveLength(SALES_FIXTURE.length);
    });
  });

  describe("summary section", () => {
    it("renders SummaryCard when reportData is set", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByTestId("summary-card")).toBeInTheDocument();
    });

    it("renders SalesDetailCard when reportData is set", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByTestId("sales-detail-card")).toBeInTheDocument();
    });

    it("renders summary section headers when reportData is set", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByText("summary.title")).toBeInTheDocument();
      expect(screen.getByText("sales.title")).toBeInTheDocument();
    });

    it("does not render SummaryCard when reportData is null", () => {
      render(<Reports />);
      expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();
    });

    it("does not render SalesDetailCard when reportData is null", () => {
      render(<Reports />);
      expect(screen.queryByTestId("sales-detail-card")).not.toBeInTheDocument();
    });

    it("renders SummaryCard even when sales list is empty", () => {
      mockUseReports = () => makeUseReports({ reportData: { ...REPORT_FIXTURE, sales: [] } });
      render(<Reports />);
      expect(screen.getByTestId("summary-card")).toBeInTheDocument();
    });
  });
});
