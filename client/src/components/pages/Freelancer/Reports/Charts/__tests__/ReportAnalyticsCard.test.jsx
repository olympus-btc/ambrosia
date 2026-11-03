import { render, screen } from "@testing-library/react";

import { freelanceReportFixture } from "../../__tests__/utils/freelanceReportFixture";
import { ReportAnalyticsCard } from "../ReportAnalyticsCard";

jest.mock("next-intl", () => ({ useTranslations: () => (translationKey) => translationKey }));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children, data }) => <div data-testid="bar-chart">{data.map(({ name }) => <span key={name}>{name}</span>)}{children}</div>,
  Bar: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children, data }) => <div>{data.map(({ name }) => <span key={name}>{name}</span>)}{children}</div>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe("ReportAnalyticsCard", () => {
  it("shows the time by project, client and task charts", () => {
    render(<ReportAnalyticsCard report={freelanceReportFixture} />);

    expect(screen.getByText("charts.durationByProject")).toBeInTheDocument();
    expect(screen.getByText("charts.durationByClient")).toBeInTheDocument();
    expect(screen.getByText("charts.durationByTask")).toBeInTheDocument();
    expect(screen.getAllByTestId("bar-chart")).toHaveLength(2);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByText("Alice Website")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("does not render the charts without report data", () => {
    render(<ReportAnalyticsCard report={{ currencies: [] }} />);

    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
  });
});
