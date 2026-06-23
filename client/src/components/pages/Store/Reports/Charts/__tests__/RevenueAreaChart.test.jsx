import { render, screen } from "@testing-library/react";

import { RevenueAreaChart } from "../RevenueAreaChart";

jest.mock("next-intl", () => ({ useTranslations: () => (key) => key }));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const dailyRevenue = [
  { date: "2024-01-01", revenue: 2000, count: 2 },
  { date: "2024-01-02", revenue: 5000, count: 3 },
];

describe("RevenueAreaChart", () => {
  const formatCurrency = (cents) => `$${cents}`;

  it("returns null when dailyRevenue is empty", () => {
    const { container } = render(<RevenueAreaChart dailyRevenue={[]} formatCurrency={formatCurrency} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the chart title when data is provided", () => {
    render(<RevenueAreaChart dailyRevenue={dailyRevenue} formatCurrency={formatCurrency} />);
    expect(screen.getByText("charts.revenueOverTime")).toBeInTheDocument();
  });

  it("renders the AreaChart when data is provided", () => {
    render(<RevenueAreaChart dailyRevenue={dailyRevenue} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });
});
