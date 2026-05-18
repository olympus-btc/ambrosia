import { render, screen, fireEvent } from "@testing-library/react";

import { DateRangeCard } from "../Filters";

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
  return { ...actual, Input, Button, Select, SelectItem };
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
    const input = screen.getByTestId("input-filters.productName");
    fireEvent.change(input, { target: { value: "Widget" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ productName: "Widget" });
  });

  it("calls onFiltersChange with activePeriod when a period button is pressed", () => {
    render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    fireEvent.click(screen.getByText("dates.period.week"));
    expect(onFiltersChange).toHaveBeenCalledWith({ activePeriod: "week", startDate: "", endDate: "" });
  });

  it("calls onFiltersChange with startDate and clears activePeriod when start date changes", () => {
    render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    const startInput = screen.getByTestId("input-dates.startLabel");
    fireEvent.change(startInput, { target: { value: "2024-01-01" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ startDate: "2024-01-01", activePeriod: null });
  });

  it("calls onFiltersChange with endDate and clears activePeriod when end date changes", () => {
    render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    const endInput = screen.getByTestId("input-dates.endLabel");
    fireEvent.change(endInput, { target: { value: "2024-01-31" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ endDate: "2024-01-31", activePeriod: null });
  });

  it("shows active filter count in toggle button when filters are set", () => {
    const filters = { ...DEFAULT_FILTERS, activePeriod: "month", productName: "Widget" };
    render(<DateRangeCard filters={filters} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText("dates.filtersActive")).toBeInTheDocument();
  });

  it("shows period toggle title when no filters are active", () => {
    const emptyFilters = { activePeriod: "", startDate: "", endDate: "", productName: "", paymentMethod: "" };
    render(<DateRangeCard filters={emptyFilters} onFiltersChange={onFiltersChange} />);
    expect(screen.getAllByText("dates.title").length).toBeGreaterThan(0);
  });

  it("disables inputs when disabled prop is true", () => {
    render(<DateRangeCard filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} disabled />);
    expect(screen.getByTestId("input-filters.productName")).toBeDisabled();
  });
});
