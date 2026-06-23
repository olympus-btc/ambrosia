import { render, screen } from "@testing-library/react";

import { TopUsersBarChart } from "../TopUsersBarChart";

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

const USERS = [
  { name: "alice", orderCount: 10 },
  { name: "bob", orderCount: 7 },
];

describe("TopUsersBarChart", () => {
  it("returns null when users is empty", () => {
    const { container } = render(<TopUsersBarChart users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the chart title when data is provided", () => {
    render(<TopUsersBarChart users={USERS} />);
    expect(screen.getByText("charts.topUsers")).toBeInTheDocument();
  });

  it("renders the BarChart when data is provided", () => {
    render(<TopUsersBarChart users={USERS} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });
});
