import { render, screen, fireEvent } from "@testing-library/react";

import { OrdersFilterBar } from "../OrdersFilterBar";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Input = ({ placeholder, value, onChange }) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
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

  return { ...actual, Input, Select, SelectItem };
});

describe("OrdersFilterBar", () => {
  it("triggers search and rows per page callbacks", () => {
    const onSearchChange = jest.fn();
    const onRowsPerPageChange = jest.fn();

    render(
      <OrdersFilterBar
        searchTerm=""
        rowsPerPage={10}
        onSearchChange={onSearchChange}
        onRowsPerPageChange={onRowsPerPageChange}
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
});
