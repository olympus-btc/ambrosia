import { render, screen } from "@testing-library/react";

import { DifferenceOverTimeChart } from "../DifferenceOverTimeChart";

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

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

const DIFFERENCE_BY_DAY = [
  { date: "2024-01-01", difference: -5 },
  { date: "2024-01-02", difference: 3 },
];

describe("DifferenceOverTimeChart", () => {
  it("returns null when differenceByDay is empty", () => {
    const { container } = render(<DifferenceOverTimeChart differenceByDay={[]} formatCurrency={(v) => `$${v}`} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the chart title and BarChart when data is provided", () => {
    render(<DifferenceOverTimeChart differenceByDay={DIFFERENCE_BY_DAY} formatCurrency={(v) => `$${v}`} />);
    expect(screen.getByText("shiftsReport.differenceOverTime")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
