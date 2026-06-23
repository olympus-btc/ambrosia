import { render, screen, fireEvent } from "@testing-library/react";

import Reports from "../Reports";

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

jest.mock("../Filters", () => ({
  PeriodFilter: ({ filters, onFiltersChange, disabled }) => (
    <div data-testid="period-filter" data-disabled={String(disabled)}>
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
      {sales.map((sale, saleIndex) => (
        <span key={saleIndex} data-testid="chart-sale">{sale.productName}</span>
      ))}
    </div>
  ),
  OrdersAnalyticsCard: ({ orders }) => (
    <div data-testid="orders-analytics-card">
      {orders.map((order) => (
        <span key={order.orderId} data-testid="chart-order">{order.orderId}</span>
      ))}
    </div>
  ),
}));

jest.mock("../Sales", () => ({
  SalesDetailCard: ({ sales }) => (
    <div data-testid="sales-detail-card">
      {sales.map((sale, saleIndex) => (
        <span key={saleIndex} data-testid="sale-item">{sale.productName}</span>
      ))}
    </div>
  ),
}));

jest.mock("../Orders", () => ({
  OrdersDetailCard: ({ orders }) => (
    <div data-testid="orders-detail-card">
      {orders.map((order) => (
        <span key={order.orderId} data-testid="order-item">{order.orderId}</span>
      ))}
    </div>
  ),
}));

jest.mock("../Summary", () => ({
  ReportSkeleton: () => <div data-testid="report-skeleton" />,
  SummaryCard: ({ stats }) => <div data-testid="summary-card">{stats?.length}</div>,
}));

jest.mock("@components/shared/PageHeader", () => ({
  PageHeader: ({ title, subtitle, actions }) => (
    <div data-testid="page-header">
      <span>{title}</span>
      <span>{subtitle}</span>
      {actions && <div data-testid="page-header-actions">{actions}</div>}
    </div>
  ),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => {
  const React = require("react");
  return {
    Card: ({ children, className }) => <div className={className}>{children}</div>,
    CardBody: ({ children }) => <div>{children}</div>,
    Tabs: ({ children, selectedKey, onSelectionChange, "aria-label": ariaLabel }) => (
      <div role="tablist" aria-label={ariaLabel}>
        {React.Children.map(
          children,
          (child) => React.cloneElement(child, {
            isSelected: child.key === selectedKey,
            onPress: () => onSelectionChange(child.key),
          }),
        )}
      </div>
    ),
    Tab: ({ title, isSelected, onPress }) => (
      <button role="tab" aria-selected={String(isSelected)} onClick={onPress}>{title}</button>
    ),
  };
});

jest.mock("lucide-react", () => ({
  AlertCircle: (props) => <svg {...props} data-testid="alert-icon" />,
  Loader2: (props) => <svg {...props} />,
  ShoppingCart: (props) => <svg {...props} />,
  Package: (props) => <svg {...props} />,
}));

const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

const SALES_FIXTURE = [
  { orderId: "order-aaa-111", productName: "Widget A", quantity: 2, priceAtOrder: 1000, userName: "alice", paymentMethod: "Cash", saleDate: "2024-01-01T10:00:00" },
  { orderId: "order-bbb-222", productName: "Widget B", quantity: 1, priceAtOrder: 3000, userName: "bob", paymentMethod: "BTC", saleDate: "2024-01-02T11:00:00" },
];

const REPORT_FIXTURE = {
  totalRevenueCents: 5000,
  totalItemsSold: 3,
  sales: SALES_FIXTURE,
};

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

  describe("PeriodFilter", () => {
    it("always renders PeriodFilter in the page header", () => {
      render(<Reports />);
      expect(screen.getByTestId("period-filter")).toBeInTheDocument();
    });

    it("passes current filters to PeriodFilter", () => {
      mockUseFiltersState = () => makeUseFiltersState({ filters: { ...DEFAULT_FILTERS, activePeriod: "week" } });
      render(<Reports />);
      expect(screen.getByTestId("active-period")).toHaveTextContent("week");
    });

    it("passes disabled=true to PeriodFilter when currency is loading", () => {
      mockUseCurrency = () => makeUseCurrency({ loading: true, formatAmount: (amountInCents) => `$${amountInCents}` });
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByTestId("period-filter")).toHaveAttribute("data-disabled", "true");
    });

    it("forwards period filter changes to handleFilters", () => {
      render(<Reports />);
      fireEvent.click(screen.getByTestId("change-filters-btn"));
      expect(mockHandleFilters).toHaveBeenCalledWith(expect.objectContaining({ activePeriod: "week" }));
    });
  });

  describe("tabs", () => {
    it("renders tab list when reportData is set", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("does not render tab content when reportData is null", () => {
      render(<Reports />);
      expect(screen.queryByTestId("orders-detail-card")).not.toBeInTheDocument();
      expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();
    });
  });

  describe("orders tab", () => {
    it("renders OrdersDetailCard when reportData is set", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByTestId("orders-detail-card")).toBeInTheDocument();
    });

    it("renders OrdersAnalyticsCard when there are orders", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      expect(screen.getByTestId("orders-analytics-card")).toBeInTheDocument();
    });

    it("does not render OrdersAnalyticsCard when sales list is empty", () => {
      mockUseReports = () => makeUseReports({ reportData: { ...REPORT_FIXTURE, sales: [] } });
      render(<Reports />);
      expect(screen.queryByTestId("orders-analytics-card")).not.toBeInTheDocument();
    });

    it("passes grouped orders to OrdersAnalyticsCard", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      const items = screen.getAllByTestId("chart-order");
      expect(items).toHaveLength(SALES_FIXTURE.length);
    });

    it("renders SummaryCard with 4 stats in orders tab", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      const summaryCards = screen.getAllByTestId("summary-card");
      expect(summaryCards.length).toBeGreaterThan(0);
      expect(summaryCards[0]).toHaveTextContent("4");
    });
  });

  describe("products tab", () => {
    function switchToProductsTab() {
      fireEvent.click(screen.getByRole("tab", { name: "tabs.products" }));
    }

    it("renders AnalyticsCard when reportData has sales", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      switchToProductsTab();
      expect(screen.getByTestId("analytics-card")).toBeInTheDocument();
    });

    it("does not render AnalyticsCard when sales list is empty", () => {
      mockUseReports = () => makeUseReports({ reportData: { ...REPORT_FIXTURE, sales: [] } });
      render(<Reports />);
      switchToProductsTab();
      expect(screen.queryByTestId("analytics-card")).not.toBeInTheDocument();
    });

    it("renders SalesDetailCard when reportData is set", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      switchToProductsTab();
      expect(screen.getByTestId("sales-detail-card")).toBeInTheDocument();
    });

    it("passes sales to AnalyticsCard", () => {
      mockUseReports = () => makeUseReports({ reportData: REPORT_FIXTURE });
      render(<Reports />);
      switchToProductsTab();
      const items = screen.getAllByTestId("chart-sale");
      expect(items).toHaveLength(SALES_FIXTURE.length);
    });
  });

  describe("no data state", () => {
    it("does not render Tabs when reportData is null", () => {
      render(<Reports />);
      expect(screen.queryByTestId("orders-detail-card")).not.toBeInTheDocument();
      expect(screen.queryByTestId("sales-detail-card")).not.toBeInTheDocument();
      expect(screen.queryByTestId("summary-card")).not.toBeInTheDocument();
    });
  });
});
