import { render, screen } from "@testing-library/react";

import { OrdersAnalyticsCard } from "../OrdersAnalyticsCard";

jest.mock("../../hooks/useChartData", () => ({
  useChartData: () => ({ revenueByDay: [] }),
}));

jest.mock("../../hooks/useOrdersChartData", () => ({
  useOrdersChartData: () => ({
    ordersPerDay: [],
    topUsersByOrders: [],
  }),
}));

jest.mock("../RevenueAreaChart", () => ({
  RevenueAreaChart: ({ dailyRevenue }) => (
    <div data-testid="revenue-area-chart" data-length={dailyRevenue.length} />
  ),
}));

jest.mock("../OrdersAreaChart", () => ({
  OrdersAreaChart: ({ ordersPerDay }) => (
    <div data-testid="orders-area-chart" data-length={ordersPerDay.length} />
  ),
}));

jest.mock("../TopUsersBarChart", () => ({
  TopUsersBarChart: ({ users }) => (
    <div data-testid="top-users-bar-chart" data-length={users.length} />
  ),
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

const formatCurrency = (cents) => `$${cents}`;
const SALES = [];
const ORDERS = [];

describe("OrdersAnalyticsCard", () => {
  it("renders RevenueAreaChart", () => {
    render(<OrdersAnalyticsCard sales={SALES} orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("revenue-area-chart")).toBeInTheDocument();
  });

  it("renders OrdersAreaChart", () => {
    render(<OrdersAnalyticsCard sales={SALES} orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("orders-area-chart")).toBeInTheDocument();
  });

  it("renders TopUsersBarChart", () => {
    render(<OrdersAnalyticsCard sales={SALES} orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("top-users-bar-chart")).toBeInTheDocument();
  });
});
