import { render, screen } from "@testing-library/react";

import { PeriodFilter } from "..";

jest.mock("../../hooks/useFilters", () => ({
  useDateRangeFilters: () => ({
    dateRangeValue: null,
    handlePeriodChange: jest.fn(),
    handleDateRangeChange: jest.fn(),
  }),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Button = ({ children, onPress, isDisabled, startContent, endContent, "aria-label": ariaLabel, color, radius }) => (
    <button onClick={onPress} disabled={isDisabled} aria-label={ariaLabel} data-color={color} data-radius={radius}>
      {startContent}
      {endContent}
      {children}
    </button>
  );
  const Popover = ({ children }) => <div>{children}</div>;
  const PopoverTrigger = ({ children }) => <div>{children}</div>;
  const PopoverContent = ({ children }) => <div data-testid="popover-content">{children}</div>;
  const DateRangePicker = ({ label, onChange, isDisabled }) => (
    <div>
      <label>{label}</label>
      <button data-testid="date-range-picker" disabled={isDisabled} onClick={() => onChange(null)}>pick</button>
    </div>
  );
  return { ...actual, Button, Popover, PopoverTrigger, PopoverContent, DateRangePicker };
});

const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

describe("PeriodFilter", () => {
  let onFiltersChange;

  beforeEach(() => {
    onFiltersChange = jest.fn();
  });

  it("renders current period label", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getAllByText("dates.period.month").length).toBeGreaterThan(0);
  });

  it("trigger button uses primary color", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    const buttons = screen.getAllByRole("button");
    const trigger = buttons[0];
    expect(trigger).toHaveAttribute("data-color", "primary");
  });

  it("active period button uses primary color and full radius", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    const activePeriodButton = screen.getAllByText("dates.period.month").find(
      (element) => element.closest("button")?.getAttribute("data-color") === "primary"
        && element.closest("button")?.getAttribute("data-radius") === "md",
    );
    expect(activePeriodButton).toBeTruthy();
  });

  it("disables buttons when disabled prop is true", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} disabled />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => expect(button).toBeDisabled());
  });

  it("shows custom date range as label when no activePeriod", () => {
    render(
      <PeriodFilter
        filters={{ ...DEFAULT_FILTERS, activePeriod: null, startDate: "2024-01-01", endDate: "2024-01-31" }}
        onFiltersChange={onFiltersChange}
      />,
    );
    expect(screen.getByText("2024-01-01 – 2024-01-31")).toBeInTheDocument();
  });
});
