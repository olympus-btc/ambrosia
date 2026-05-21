import { render, screen, fireEvent } from "@testing-library/react";

import { DateRangeCard } from "..";

jest.mock("../../hooks/useFilters", () => ({
  useDateRangeFilters: () => ({
    activeFilterCount: 0,
    dateRangeValue: null,
    handlePeriodChange: jest.fn(),
    handleDateRangeChange: jest.fn(),
    handlePaymentMethod: jest.fn(),
  }),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Input = ({ label, value, onChange, onClear, isDisabled, type }) => (
    <div>
      <label>{label}</label>
      <input
        data-testid={`input-${label}`}
        type={type ?? "text"}
        value={value ?? ""}
        disabled={isDisabled}
        onChange={onChange}
      />
      {onClear && <button data-testid={`clear-${label}`} onClick={onClear}>clear</button>}
    </div>
  );
  const Button = ({ children, onPress, isDisabled, endContent }) => (
    <button onClick={onPress} disabled={isDisabled}>
      {endContent}
      {children}
    </button>
  );
  const DateRangePicker = ({ label, onChange, isDisabled }) => (
    <div>
      <label>{label}</label>
      <button data-testid="date-range-picker" disabled={isDisabled} onClick={() => onChange(null)}>pick</button>
    </div>
  );
  const Select = ({ label, children, onSelectionChange, isDisabled }) => (
    <div>
      <label>{label}</label>
      <select
        data-testid={`select-${label}`}
        disabled={isDisabled}
        onChange={(e) => onSelectionChange(new Set([e.target.value]))}
      >
        {children}
      </select>
    </div>
  );
  const SelectItem = ({ children }) => <option>{children}</option>;
  return { ...actual, Input, Button, DateRangePicker, Select, SelectItem };
});

const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

describe("DateRangeCard", () => {
  let onFiltersChange;

  beforeEach(() => {
    onFiltersChange = jest.fn();
  });

  it("renders productName input and paymentMethod select", () => {
    render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText("filters.productName")).toBeInTheDocument();
    expect(screen.getByText("filters.paymentMethod")).toBeInTheDocument();
  });

  it("calls onFiltersChange with productName when input changes", () => {
    render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByTestId("input-filters.productName"), { target: { value: "Widget" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ productName: "Widget" });
  });

  it("shows active filter count in toggle button when filters are set", () => {
    const { rerender } = render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getAllByText("dates.title").length).toBeGreaterThan(0);

    const { useDateRangeFilters } = require("../../hooks/useFilters");
    useDateRangeFilters.mockReturnValue = undefined;
    jest.spyOn(require("../../hooks/useFilters"), "useDateRangeFilters").mockReturnValue({
      activeFilterCount: 2,
      dateRangeValue: null,
      handlePeriodChange: jest.fn(),
      handleDateRangeChange: jest.fn(),
      handlePaymentMethod: jest.fn(),
    });
    rerender(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText("dates.filtersActive")).toBeInTheDocument();
  });

  it("disables inputs when disabled prop is true", () => {
    render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} disabled />);
    expect(screen.getByTestId("input-filters.productName")).toBeDisabled();
  });
});
