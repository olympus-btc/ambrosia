import { render, screen } from "@testing-library/react";

import { OrdersAreaChart } from "../OrdersAreaChart";

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }) => <div>{children}</div>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const ORDERS_PER_DAY = [
  { date: "2024-01-01", orders: 3 },
  { date: "2024-01-02", orders: 5 },
];

describe("OrdersAreaChart", () => {
  it("returns null when ordersPerDay is empty", () => {
    const { container } = render(<OrdersAreaChart ordersPerDay={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the chart title when data is provided", () => {
    render(<OrdersAreaChart ordersPerDay={ORDERS_PER_DAY} />);
    expect(screen.getByText("charts.ordersOverTime")).toBeInTheDocument();
  });

  it("renders the BarChart when data is provided", () => {
    render(<OrdersAreaChart ordersPerDay={ORDERS_PER_DAY} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
