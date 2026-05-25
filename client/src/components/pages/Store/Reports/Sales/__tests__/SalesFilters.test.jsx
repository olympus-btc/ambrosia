import { render, screen, fireEvent } from "@testing-library/react";

import { SalesFilters } from "../SalesFilters";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Input = ({ label, value, onChange, onClear, isDisabled, "aria-label": ariaLabel }) => (
    <div>
      <label>{label}</label>
      <input
        data-testid={`input-${label}`}
        aria-label={ariaLabel ?? label}
        value={value ?? ""}
        disabled={isDisabled}
        onChange={onChange}
      />
      {onClear && <button data-testid={`clear-${label}`} onClick={onClear}>clear</button>}
    </div>
  );
  const Select = ({ label, children, onSelectionChange, isDisabled, "aria-label": ariaLabel }) => (
    <div>
      <label>{label}</label>
      <select
        data-testid={`select-${label}`}
        aria-label={ariaLabel ?? label}
        disabled={isDisabled}
        onChange={(e) => onSelectionChange(new Set([e.target.value]))}
      >
        {children}
      </select>
    </div>
  );
  const SelectItem = ({ children, value }) => <option value={value ?? children}>{children}</option>;
  return { ...actual, Input, Select, SelectItem };
});

const DEFAULT_FILTERS = {
  activePeriod: "month",
  startDate: "",
  endDate: "",
  productName: "",
  paymentMethod: "",
};

describe("SalesFilters", () => {
  let onFiltersChange;

  beforeEach(() => {
    onFiltersChange = jest.fn();
  });

  it("renders product name input and payment method select", () => {
    render(<SalesFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    expect(screen.getByText("filters.productName")).toBeInTheDocument();
    expect(screen.getByText("filters.paymentMethod")).toBeInTheDocument();
  });

  it("calls onFiltersChange with productName when input changes", () => {
    render(<SalesFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByTestId("input-filters.productName"), { target: { value: "Widget" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ productName: "Widget" });
  });

  it("calls onFiltersChange with empty string when productName is cleared", () => {
    render(<SalesFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    fireEvent.click(screen.getByTestId("clear-filters.productName"));
    expect(onFiltersChange).toHaveBeenCalledWith({ productName: "" });
  });

  it("calls onFiltersChange with paymentMethod when a specific method is selected", () => {
    render(<SalesFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByTestId("select-filters.paymentMethod"), { target: { value: "Cash" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ paymentMethod: "Cash" });
  });

  it("calls onFiltersChange with empty string when 'all' is selected", () => {
    render(<SalesFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByTestId("select-filters.paymentMethod"), { target: { value: "all" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ paymentMethod: "" });
  });

  it("disables inputs when disabled prop is true", () => {
    render(<SalesFilters filters={DEFAULT_FILTERS} onFiltersChange={onFiltersChange} disabled />);
    expect(screen.getByTestId("input-filters.productName")).toBeDisabled();
    expect(screen.getByTestId("select-filters.paymentMethod")).toBeDisabled();
  });
});
