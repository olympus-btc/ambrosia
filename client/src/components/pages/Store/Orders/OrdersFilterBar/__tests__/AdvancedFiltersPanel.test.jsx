import { render, screen, fireEvent } from "@testing-library/react";

import { AdvancedFiltersPanel } from "../AdvancedFiltersPanel";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const DateRangePicker = ({ label, onChange }) => (
    <div>
      <label>{label}</label>
      <button
        data-testid="date-range-picker"
        onClick={() => onChange({ start: { toString: () => "2024-01-01" }, end: { toString: () => "2024-01-31" } })}
      >
        pick
      </button>
      <button data-testid="date-range-clear" onClick={() => onChange(null)}>
        clear
      </button>
    </div>
  );
  const NumberInput = ({ label, value, onValueChange }) => (
    <input
      aria-label={label}
      type="number"
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
  const Button = ({ children, onPress }) => (
    <button type="button" onClick={onPress}>{children}</button>
  );
  const Select = ({ "aria-label": ariaLabel, selectedKeys, onSelectionChange, children }) => (
    <select
      aria-label={ariaLabel}
      value={selectedKeys?.[0] || ""}
      onChange={(e) => onSelectionChange?.(new Set([e.target.value]))}
    >
      {children}
    </select>
  );
  const SelectItem = ({ value, children }) => <option value={value}>{children}</option>;

  return { ...actual, Button, DateRangePicker, NumberInput, Select, SelectItem };
});

jest.mock("@internationalized/date", () => ({
  parseDate: (str) => ({ toString: () => str }),
}));

describe("AdvancedFiltersPanel", () => {
  const defaultFilters = {
    status: null,
    paymentMethod: null,
    startDate: null,
    endDate: null,
    minTotal: null,
    maxTotal: null,
    sortBy: "date",
    sortOrder: "desc",
  };

  it("renders all filter fields", () => {
    render(
      <AdvancedFiltersPanel
        filters={defaultFilters}
        paymentMethods={[{ id: "cash", name: "Cash" }]}
        onFiltersChange={jest.fn()}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Payment method")).toBeInTheDocument();
    expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    expect(screen.getByLabelText("filter.minTotalLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("filter.maxTotalLabel")).toBeInTheDocument();
  });

  it("calls onFiltersChange when status changes", () => {
    const onFiltersChange = jest.fn();
    render(
      <AdvancedFiltersPanel
        filters={defaultFilters}
        paymentMethods={[]}
        onFiltersChange={onFiltersChange}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "paid" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ status: "paid" });
  });

  it("calls onFiltersChange with startDate and endDate when range is selected", () => {
    const onFiltersChange = jest.fn();
    render(
      <AdvancedFiltersPanel
        filters={defaultFilters}
        paymentMethods={[]}
        onFiltersChange={onFiltersChange}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("date-range-picker"));
    expect(onFiltersChange).toHaveBeenCalledWith({ startDate: "2024-01-01", endDate: "2024-01-31" });
  });

  it("calls onFiltersChange with null dates when range is cleared", () => {
    const onFiltersChange = jest.fn();
    render(
      <AdvancedFiltersPanel
        filters={defaultFilters}
        paymentMethods={[]}
        onFiltersChange={onFiltersChange}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("date-range-clear"));
    expect(onFiltersChange).toHaveBeenCalledWith({ startDate: null, endDate: null });
  });

  it("calls onApplyFilters and onClearFilters", () => {
    const onApplyFilters = jest.fn();
    const onClearFilters = jest.fn();
    render(
      <AdvancedFiltersPanel
        filters={defaultFilters}
        paymentMethods={[]}
        onFiltersChange={jest.fn()}
        onApplyFilters={onApplyFilters}
        onClearFilters={onClearFilters}
      />,
    );

    fireEvent.click(screen.getByText("filter.apply"));
    expect(onApplyFilters).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("filter.clear"));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
