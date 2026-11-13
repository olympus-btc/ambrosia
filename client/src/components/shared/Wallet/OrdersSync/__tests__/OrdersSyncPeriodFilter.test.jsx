import { render } from "@testing-library/react";

import { OrdersSyncPeriodFilter } from "../OrdersSyncPeriodFilter";

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

function buildDateRangeValue() {
  return {
    start: { toString: () => "2024-01-01" },
    end: { toString: () => "2024-01-31" },
  };
}

beforeEach(() => {
  capturedProps = undefined;
});

describe("OrdersSyncPeriodFilter", () => {
  it("builds a label for every period from the wallet translations", () => {
    render(
      <OrdersSyncPeriodFilter
        activePeriod="month"
        dateRangeValue={buildDateRangeValue()}
        onPeriodChange={jest.fn()}
        onDateRangeChange={jest.fn()}
      />,
    );

    expect(capturedProps.periodLabels).toEqual({
      day: "ordersSync.period.day",
      week: "ordersSync.period.week",
      month: "ordersSync.period.month",
      year: "ordersSync.period.year",
    });
  });

  it("builds the custom range label from the date range value", () => {
    render(
      <OrdersSyncPeriodFilter
        activePeriod={null}
        dateRangeValue={buildDateRangeValue()}
        onPeriodChange={jest.fn()}
        onDateRangeChange={jest.fn()}
      />,
    );

    expect(capturedProps.customRangeLabel).toBe("2024-01-01 – 2024-01-31");
  });

  it("passes the wallet title, subtitle, and date range label", () => {
    render(
      <OrdersSyncPeriodFilter
        activePeriod="month"
        dateRangeValue={buildDateRangeValue()}
        onPeriodChange={jest.fn()}
        onDateRangeChange={jest.fn()}
      />,
    );

    expect(capturedProps.title).toBe("ordersSync.periodFilter.title");
    expect(capturedProps.subtitle).toBe("ordersSync.periodFilter.subtitle");
    expect(capturedProps.dateRangeLabel).toBe("ordersSync.dateRangeLabel");
  });

  it("forces the green background on the trigger and the active preset", () => {
    render(
      <OrdersSyncPeriodFilter
        activePeriod="month"
        dateRangeValue={buildDateRangeValue()}
        onPeriodChange={jest.fn()}
        onDateRangeChange={jest.fn()}
      />,
    );

    expect(capturedProps.triggerClassName).toBe("bg-green-800");
    expect(capturedProps.activePeriodClassName).toBe("bg-green-800");
  });

  it("forwards activePeriod, dateRangeValue, isDisabled, and the change handlers unchanged", () => {
    const dateRangeValue = buildDateRangeValue();
    const onPeriodChange = jest.fn();
    const onDateRangeChange = jest.fn();

    render(
      <OrdersSyncPeriodFilter
        activePeriod="week"
        dateRangeValue={dateRangeValue}
        onPeriodChange={onPeriodChange}
        onDateRangeChange={onDateRangeChange}
        isDisabled
      />,
    );

    expect(capturedProps.activePeriod).toBe("week");
    expect(capturedProps.dateRangeValue).toBe(dateRangeValue);
    expect(capturedProps.onPeriodChange).toBe(onPeriodChange);
    expect(capturedProps.onDateRangeChange).toBe(onDateRangeChange);
    expect(capturedProps.isDisabled).toBe(true);
  });
});
