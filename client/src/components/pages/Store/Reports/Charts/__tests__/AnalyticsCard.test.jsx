import { render, screen } from "@testing-library/react";

import { AnalyticsCard } from "../AnalyticsCard";

jest.mock("../../hooks/useChartData", () => ({
  useChartData: () => ({
    revenueByDay: [],
    topProducts: [],
    paymentMethodSplit: [],
  }),
}));

jest.mock("../RevenueAreaChart", () => ({
  RevenueAreaChart: ({ dailyRevenue }) => (
    <div data-testid="revenue-area-chart" data-length={dailyRevenue.length} />
  ),
}));

jest.mock("../TopProductsBarChart", () => ({
  TopProductsBarChart: ({ products }) => (
    <div data-testid="top-products-bar-chart" data-length={products.length} />
  ),
}));

jest.mock("../PaymentMethodPieChart", () => ({
  PaymentMethodPieChart: ({ paymentMethods }) => (
    <div data-testid="payment-method-pie-chart" data-length={paymentMethods.length} />
  ),
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

const formatCurrency = (cents) => `$${cents}`;
const SALES = [{ productName: "Widget A", saleDate: "2024-01-01", quantity: 1, priceAtOrder: 1000, paymentMethod: "Cash" }];

describe("AnalyticsCard", () => {
  it("renders RevenueAreaChart", () => {
    render(<AnalyticsCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("revenue-area-chart")).toBeInTheDocument();
  });

  it("renders TopProductsBarChart", () => {
    render(<AnalyticsCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("top-products-bar-chart")).toBeInTheDocument();
  });

  it("renders PaymentMethodPieChart", () => {
    render(<AnalyticsCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("payment-method-pie-chart")).toBeInTheDocument();
  });
});
