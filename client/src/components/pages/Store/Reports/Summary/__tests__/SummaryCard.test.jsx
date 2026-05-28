import { render, screen } from "@testing-library/react";

import { SummaryCard } from "../SummaryCard";

jest.mock("../SummaryStat", () => ({
  SummaryStat: ({ label, value }) => (
    <div data-testid="summary-stat">{label}:{value}</div>
  ),
}));

const STATS = [
  { label: "Revenue", value: "$100" },
  { label: "Orders", value: "5" },
  { label: "Avg ticket", value: "$20" },
  { label: "Items/order", value: "2.0" },
];

describe("SummaryCard", () => {
  it("renders one SummaryStat per stat entry", () => {
    render(<SummaryCard stats={STATS} />);
    expect(screen.getAllByTestId("summary-stat")).toHaveLength(4);
  });

  it("passes label and value to each SummaryStat", () => {
    render(<SummaryCard stats={STATS} />);
    expect(screen.getByText("Revenue:$100")).toBeInTheDocument();
    expect(screen.getByText("Orders:5")).toBeInTheDocument();
  });

  it("renders nothing when stats is empty", () => {
    render(<SummaryCard stats={[]} />);
    expect(screen.queryByTestId("summary-stat")).not.toBeInTheDocument();
  });
});
