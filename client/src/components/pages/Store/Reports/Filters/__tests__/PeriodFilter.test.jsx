import { render } from "@testing-library/react";

import { PeriodFilter } from "..";

let capturedProps;
jest.mock("@/components/shared/PeriodRangeFilter", () => ({
  PeriodRangeFilter: (props) => {
    capturedProps = props;
    return <div data-testid="period-range-filter" />;
  },
  buildPeriodLabels: (translatePeriod) => ({
    day: translatePeriod("day"),
    week: translatePeriod("week"),
    month: translatePeriod("month"),
    year: translatePeriod("year"),
  }),
}));

jest.mock("../../hooks/useFilters", () => ({
  useDateRangeFilters: () => ({
    dateRangeValue: null,
    handlePeriodChange: jest.fn(),
    handleDateRangeChange: jest.fn(),
  }),
}));

const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

beforeEach(() => {
  capturedProps = undefined;
});

describe("PeriodFilter", () => {
  let onFiltersChange;

  beforeEach(() => {
    onFiltersChange = jest.fn();
  });

  it("builds a label for every period from the reports translations", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    expect(capturedProps.periodLabels).toEqual({
      day: "dates.period.day",
      week: "dates.period.week",
      month: "dates.period.month",
      year: "dates.period.year",
    });
  });

  it("passes the active period and a null custom range label when a period is active", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    expect(capturedProps.activePeriod).toBe("month");
    expect(capturedProps.customRangeLabel).toBeNull();
  });

  it("builds the custom range label from the filters when no period is active", () => {
    render(
      <PeriodFilter
        filters={{ ...DEFAULT_FILTERS, activePeriod: null, startDate: "2024-01-01", endDate: "2024-01-31" }}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(capturedProps.customRangeLabel).toBe("2024-01-01 – 2024-01-31");
  });

  it("forwards the disabled prop as isDisabled", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} disabled />);

    expect(capturedProps.isDisabled).toBe(true);
  });

  it("passes the default reports subtitle when none is provided", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    expect(capturedProps.subtitle).toBe("dates.subtitle");
  });

  it("passes a custom subtitle when provided", () => {
    render(
      <PeriodFilter
        filters={DEFAULT_FILTERS}
        onFiltersChange={onFiltersChange}
        subtitle="Filter billable time by period"
      />,
    );

    expect(capturedProps.subtitle).toBe("Filter billable time by period");
  });

  it("passes the reports title and date range label", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    expect(capturedProps.title).toBe("dates.title");
    expect(capturedProps.dateRangeLabel).toBe("dates.title");
  });

  it("places the popover at the bottom end", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    expect(capturedProps.placement).toBe("bottom-end");
  });

  it("forwards the date range value and change handlers from the hook", () => {
    render(<PeriodFilter filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);

    expect(capturedProps.dateRangeValue).toBeNull();
    expect(typeof capturedProps.onPeriodChange).toBe("function");
    expect(typeof capturedProps.onDateRangeChange).toBe("function");
  });
});
