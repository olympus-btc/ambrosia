import { render, screen, fireEvent } from "@testing-library/react";

import { OrdersFilterBar } from "../OrdersFilterBar";

jest.mock("../AdvancedFiltersPanel", () => ({
  AdvancedFiltersPanel: ({ filters, onFiltersChange, onApplyFilters, onClearFilters, paymentMethods }) => (
    <div>
      <select
        aria-label="Status"
        value={filters.status ?? ""}
        onChange={(e) => onFiltersChange({ status: e.target.value || null })}
      >
        <option value="">filter.allStatuses</option>
        <option value="paid">paid</option>
      </select>
      <select
        aria-label="Payment method"
        value={filters.paymentMethod ?? ""}
        onChange={(e) => onFiltersChange({ paymentMethod: e.target.value || null })}
      >
        <option value="">filter.allPaymentMethods</option>
        {paymentMethods.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
      </select>
      <button type="button" onClick={onApplyFilters}>filter.apply</button>
      <button type="button" onClick={onClearFilters}>filter.clear</button>
    </div>
  ),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Input = ({ placeholder, value, onChange }) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
  );
  const Button = ({ children, onPress, endContent }) => (
    <button type="button" onClick={onPress}>
      {children}
      {endContent}
    </button>
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

  return { ...actual, Button, Input, Select, SelectItem };
});

describe("OrdersFilterBar", () => {
  const defaultFilters = {
    startDate: null,
    endDate: null,
    status: null,
    userId: null,
    paymentMethod: null,
    minTotal: null,
    maxTotal: null,
    sortBy: "date",
    sortOrder: "desc",
  };

  it("triggers search and rows callbacks", () => {
    const onSearchChange = jest.fn();
    const onRowsPerPageChange = jest.fn();

    render(
      <OrdersFilterBar
        searchTerm=""
        rowsPerPage={10}
        filters={defaultFilters}
        paymentMethods={[{ id: "cash", name: "Cash" }]}
        onSearchChange={onSearchChange}
        onRowsPerPageChange={onRowsPerPageChange}
        onFiltersChange={jest.fn()}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("filter.searchPlaceholder"), {
      target: { value: "order-1" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("order-1");

    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "5" },
    });
    expect(onRowsPerPageChange).toHaveBeenCalledWith("5");
  });

  it("renders the more filters toggle button", () => {
    render(
      <OrdersFilterBar
        searchTerm=""
        rowsPerPage={10}
        filters={defaultFilters}
        paymentMethods={[]}
        onSearchChange={jest.fn()}
        onRowsPerPageChange={jest.fn()}
        onFiltersChange={jest.fn()}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />,
    );

    expect(screen.getByText("filter.moreFilters")).toBeInTheDocument();
  });

  it("shows active filter count in trigger", () => {
    render(
      <OrdersFilterBar
        searchTerm=""
        rowsPerPage={10}
        filters={{ ...defaultFilters, status: "paid", paymentMethod: "Cash" }}
        paymentMethods={[{ id: "cash", name: "Cash" }]}
        onSearchChange={jest.fn()}
        onRowsPerPageChange={jest.fn()}
        onFiltersChange={jest.fn()}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />,
    );

    expect(screen.getByText("filter.moreFiltersActive")).toBeInTheDocument();
  });

  it("passes apply and clear callbacks to AdvancedFiltersPanel", () => {
    const onApplyFilters = jest.fn();
    const onClearFilters = jest.fn();

    render(
      <OrdersFilterBar
        searchTerm=""
        rowsPerPage={10}
        filters={defaultFilters}
        paymentMethods={[]}
        onSearchChange={jest.fn()}
        onRowsPerPageChange={jest.fn()}
        onFiltersChange={jest.fn()}
        onApplyFilters={onApplyFilters}
        onClearFilters={onClearFilters}
      />,
    );

    fireEvent.click(screen.getByText("filter.moreFilters"));
    fireEvent.click(screen.getByText("filter.apply"));
    expect(onApplyFilters).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("filter.clear"));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
