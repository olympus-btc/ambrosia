import { render, screen } from "@testing-library/react";

import { TopProductsBarChart } from "../TopProductsBarChart";

jest.mock("next-intl", () => ({ useTranslations: () => (key) => key }));

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

const products = [
  { name: "Widget A", revenue: 5000, quantity: 5 },
  { name: "Widget B", revenue: 3000, quantity: 3 },
];

describe("TopProductsBarChart", () => {
  const formatCurrency = (cents) => `$${cents}`;

  it("returns null when products is empty", () => {
    const { container } = render(<TopProductsBarChart products={[]} formatCurrency={formatCurrency} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the chart title when data is provided", () => {
    render(<TopProductsBarChart products={products} formatCurrency={formatCurrency} />);
    expect(screen.getByText("charts.topProducts")).toBeInTheDocument();
  });

  it("renders the BarChart when data is provided", () => {
    render(<TopProductsBarChart products={products} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
