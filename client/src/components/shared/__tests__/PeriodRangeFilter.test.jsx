import { fireEvent, render, screen } from "@testing-library/react";

import { buildPeriodLabels, PeriodRangeFilter } from "../PeriodRangeFilter";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Button = ({ children, onPress, isDisabled, startContent, endContent, color, radius, className }) => (
    <button onClick={onPress} disabled={isDisabled} data-color={color} data-radius={radius} className={className}>
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

const PERIOD_LABELS = { day: "Today", week: "This Week", month: "This Month", year: "This Year" };

function buildDateRangeValue() {
  return {
    start: { toString: () => "2024-01-01" },
    end: { toString: () => "2024-01-31" },
  };
}

function renderPeriodRangeFilter(overrides = {}) {
  const onPeriodChange = jest.fn();
  const onDateRangeChange = jest.fn();
  render(
    <PeriodRangeFilter
      activePeriod="month"
      dateRangeValue={buildDateRangeValue()}
      onPeriodChange={onPeriodChange}
      onDateRangeChange={onDateRangeChange}
      title="Select a date range"
      subtitle="Choose a quick period or a custom range."
      dateRangeLabel="Date range"
      periodLabels={PERIOD_LABELS}
      {...overrides}
    />,
  );
  return { onPeriodChange, onDateRangeChange };
}

describe("buildPeriodLabels", () => {
  it("translates every period using the given function", () => {
    const periodLabels = buildPeriodLabels((period) => `translated-${period}`);

    expect(periodLabels).toEqual({
      day: "translated-day",
      week: "translated-week",
      month: "translated-month",
      year: "translated-year",
    });
  });
});

describe("PeriodRangeFilter", () => {
  it("renders the active period label", () => {
    renderPeriodRangeFilter();

    expect(screen.getAllByText("This Month").length).toBeGreaterThan(0);
  });

  it("trigger button uses primary color", () => {
    renderPeriodRangeFilter();

    expect(screen.getAllByRole("button")[0]).toHaveAttribute("data-color", "primary");
  });

  it("applies the trigger class name to the trigger button", () => {
    renderPeriodRangeFilter({ triggerClassName: "bg-green-800" });

    expect(screen.getAllByRole("button")[0]).toHaveClass("bg-green-800");
  });

  it("applies the active period class name to the active preset button", () => {
    renderPeriodRangeFilter({ activePeriodClassName: "bg-green-800" });

    const activePeriodButton = screen.getAllByText("This Month").find(
      (element) => element.closest("button")?.classList.contains("bg-green-800"),
    );
    expect(activePeriodButton).toBeTruthy();
  });

  it("disables every button when isDisabled is true", () => {
    renderPeriodRangeFilter({ isDisabled: true });

    screen.getAllByRole("button").forEach((button) => expect(button).toBeDisabled());
  });

  it("renders the title and subtitle", () => {
    renderPeriodRangeFilter();

    expect(screen.getByText("Select a date range")).toBeInTheDocument();
    expect(screen.getByText("Choose a quick period or a custom range.")).toBeInTheDocument();
  });

  it("renders every period option", () => {
    renderPeriodRangeFilter();

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("This Year")).toBeInTheDocument();
  });

  it("shows the custom range label when no period is active", () => {
    renderPeriodRangeFilter({ activePeriod: null, customRangeLabel: "2024-01-01 – 2024-01-31" });

    expect(screen.getByText("2024-01-01 – 2024-01-31")).toBeInTheDocument();
  });

  it("shows the title as the label when there is no active period or custom range label", () => {
    renderPeriodRangeFilter({ activePeriod: null, customRangeLabel: null });

    expect(screen.getAllByText("Select a date range").length).toBeGreaterThan(0);
  });

  it("calls onPeriodChange when a period option is pressed", () => {
    const { onPeriodChange } = renderPeriodRangeFilter();

    fireEvent.click(screen.getByText("This Week"));

    expect(onPeriodChange).toHaveBeenCalledWith("week");
  });

  it("calls onDateRangeChange when the date range picker changes", () => {
    const { onDateRangeChange } = renderPeriodRangeFilter();

    fireEvent.click(screen.getByTestId("date-range-picker"));

    expect(onDateRangeChange).toHaveBeenCalledWith(null);
  });
});
