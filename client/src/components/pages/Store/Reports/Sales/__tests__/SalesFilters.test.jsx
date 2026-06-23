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

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

const DEFAULT_PROPS = {
  search: "",
  paymentMethod: "",
};

const SALES_WITH_METHODS = [
  { paymentMethod: "Cash" },
  { paymentMethod: "BTC" },
  { paymentMethod: "Cash" },
];

describe("SalesFilters", () => {
  let onSearchChange;
  let onPaymentMethodChange;

  beforeEach(() => {
    onSearchChange = jest.fn();
    onPaymentMethodChange = jest.fn();
  });

  it("renders search input and payment method select", () => {
    render(<SalesFilters {...DEFAULT_PROPS} onSearchChange={onSearchChange} onPaymentMethodChange={onPaymentMethodChange} />);
    expect(screen.getByText("filters.search")).toBeInTheDocument();
    expect(screen.getByText("filters.paymentMethod")).toBeInTheDocument();
  });

  it("calls onSearchChange when input changes", () => {
    render(<SalesFilters {...DEFAULT_PROPS} onSearchChange={onSearchChange} onPaymentMethodChange={onPaymentMethodChange} />);
    fireEvent.change(screen.getByTestId("input-filters.search"), { target: { value: "Widget" } });
    expect(onSearchChange).toHaveBeenCalledWith("Widget");
  });

  it("calls onSearchChange with empty string when cleared", () => {
    render(<SalesFilters {...DEFAULT_PROPS} onSearchChange={onSearchChange} onPaymentMethodChange={onPaymentMethodChange} />);
    fireEvent.click(screen.getByTestId("clear-filters.search"));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("calls onPaymentMethodChange with method when a specific method is selected", () => {
    render(<SalesFilters {...DEFAULT_PROPS} onSearchChange={onSearchChange} onPaymentMethodChange={onPaymentMethodChange} sales={SALES_WITH_METHODS} />);
    fireEvent.change(screen.getByTestId("select-filters.paymentMethod"), { target: { value: "Cash" } });
    expect(onPaymentMethodChange).toHaveBeenCalledWith("Cash");
  });

  it("calls onPaymentMethodChange with empty string when 'all' is selected", () => {
    render(<SalesFilters {...DEFAULT_PROPS} onSearchChange={onSearchChange} onPaymentMethodChange={onPaymentMethodChange} sales={SALES_WITH_METHODS} />);
    fireEvent.change(screen.getByTestId("select-filters.paymentMethod"), { target: { value: "all" } });
    expect(onPaymentMethodChange).toHaveBeenCalledWith("");
  });

  it("shows only methods present in sales data plus all option", () => {
    render(<SalesFilters {...DEFAULT_PROPS} onSearchChange={onSearchChange} onPaymentMethodChange={onPaymentMethodChange} sales={SALES_WITH_METHODS} />);
    const select = screen.getByTestId("select-filters.paymentMethod");
    const options = Array.from(select.querySelectorAll("option")).map((option) => option.value);
    expect(options).toContain("all");
    expect(options).toContain("Cash");
    expect(options).toContain("BTC");
    expect(options).toHaveLength(3);
  });

  it("disables inputs when disabled prop is true", () => {
    render(<SalesFilters {...DEFAULT_PROPS} onSearchChange={onSearchChange} onPaymentMethodChange={onPaymentMethodChange} disabled />);
    expect(screen.getByTestId("input-filters.search")).toBeDisabled();
    expect(screen.getByTestId("select-filters.paymentMethod")).toBeDisabled();
  });
});
