import { render, screen } from "@testing-library/react";

import { PaymentMethodPieChart } from "../PaymentMethodPieChart";

jest.mock("next-intl", () => ({ useTranslations: () => (key) => key }));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const paymentMethods = [
  { method: "Cash", revenue: 5000, count: 3 },
  { method: "BTC", revenue: 3000, count: 1 },
];

describe("PaymentMethodPieChart", () => {
  const formatCurrency = (cents) => `$${cents}`;

  it("returns null when paymentMethods is empty", () => {
    const { container } = render(<PaymentMethodPieChart paymentMethods={[]} formatCurrency={formatCurrency} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the chart title when data is provided", () => {
    render(<PaymentMethodPieChart paymentMethods={paymentMethods} formatCurrency={formatCurrency} />);
    expect(screen.getByText("charts.paymentSplit")).toBeInTheDocument();
  });

  it("renders the PieChart when data is provided", () => {
    render(<PaymentMethodPieChart paymentMethods={paymentMethods} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });
});
