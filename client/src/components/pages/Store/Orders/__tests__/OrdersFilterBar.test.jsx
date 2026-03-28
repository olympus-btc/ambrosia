import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { OrdersFilterBar } from "../OrdersFilterBar";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Popover = ({ children }) => <div>{children}</div>;
  const PopoverTrigger = ({ children }) => <div>{children}</div>;
  const PopoverContent = ({ children }) => <div>{children}</div>;
  const Input = ({ placeholder, value, onChange }) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
  );
  const NumberInput = ({ label, placeholder, value, onValueChange }) => (
    <input
      aria-label={label}
      placeholder={placeholder}
      type="number"
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
  const Button = ({ children, onPress }) => (
    <button type="button" onClick={onPress}>
      {children}
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
  const SelectItem = ({ value, children }) => (
    <option value={value}>{children}</option>
  );

  return {
    ...actual,
    Button,
    Input,
    NumberInput,
    Popover,
    PopoverTrigger,
    PopoverContent,
    Select,
    SelectItem,
  };
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

  it("triggers search, rows, and status callbacks", () => {
    const onSearchChange = jest.fn();
    const onRowsPerPageChange = jest.fn();
    const onFiltersChange = jest.fn();
    const onApplyFilters = jest.fn();
    const onClearFilters = jest.fn();

    render(
      <OrdersFilterBar
        searchTerm=""
        rowsPerPage={10}
        filters={defaultFilters}
        paymentMethods={[{ id: "cash", name: "Cash" }]}
        onSearchChange={onSearchChange}
        onRowsPerPageChange={onRowsPerPageChange}
        onFiltersChange={onFiltersChange}
        onApplyFilters={onApplyFilters}
        onClearFilters={onClearFilters}
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

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "paid" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ status: "paid" });
  });

  it("clicking clear resets all filter fields", () => {
    function Harness() {
      const [filters, setFilters] = React.useState({
        ...defaultFilters,
        status: "paid",
        paymentMethod: "Cash",
        startDate: "2025-01-01",
      });

      return (
        <OrdersFilterBar
          searchTerm=""
          rowsPerPage={10}
          filters={filters}
          paymentMethods={[{ id: "cash", name: "Cash" }]}
          onSearchChange={jest.fn()}
          onRowsPerPageChange={jest.fn()}
          onFiltersChange={(partial) => setFilters((current) => ({ ...current, ...partial }))}
          onApplyFilters={jest.fn()}
          onClearFilters={() => setFilters(defaultFilters)}
        />
      );
    }

    render(<Harness />);

    expect(screen.getByLabelText("Status")).toHaveValue("paid");
    expect(screen.getByLabelText("Payment method")).toHaveValue("Cash");

    fireEvent.click(screen.getByText("filter.clear"));

    expect(screen.getByLabelText("Status")).toHaveValue("");
    expect(screen.getByLabelText("Payment method")).toHaveValue("");
  });

  it("clicking apply calls onApplyFilters", () => {
    const onApplyFilters = jest.fn();

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
        onClearFilters={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText("filter.apply"));
    expect(onApplyFilters).toHaveBeenCalledTimes(1);
  });

  it("shows active filter count in dropdown trigger", () => {
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
});
