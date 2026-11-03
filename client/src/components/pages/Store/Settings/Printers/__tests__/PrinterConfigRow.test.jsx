import { fireEvent, render, screen } from "@testing-library/react";

import { PrinterConfigRow } from "../PrinterConfigRow";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/hooks/usePermission");

jest.mock("../CashDrawerSettings", () => ({
  CashDrawerSettings: () => <div data-testid="cash-drawer-settings" />,
}));

jest.mock("@components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => (
    <button type="button" onClick={onPress} aria-label="delete">delete</button>
  ),
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardBody: ({ children, ...props }) => <div {...props}>{children}</div>,
  Button: ({ onPress, children, "aria-label": ariaLabel, isIconOnly, ...props }) => (
    <button type="button" onClick={onPress} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  ),
  Select: ({ label, children, onChange, selectedKeys }) => (
    <label>
      {label}
      <select
        aria-label={label}
        onChange={onChange}
        value={(selectedKeys && selectedKeys[0]) ?? ""}
      >
        {children}
      </select>
    </label>
  ),
  SelectItem: ({ value, children }) => (
    <option value={value}>{children}</option>
  ),
  Switch: ({ isSelected, onValueChange, children }) => (
    <label>
      <input
        type="checkbox"
        checked={!!isSelected}
        onChange={(event) => onValueChange(event.target.checked)}
      />
      {children}
    </label>
  ),
}));

describe("PrinterConfigRow", () => {
  it("renders badges and handles actions", () => {
    const onSetDefault = jest.fn();
    const onToggleDefault = jest.fn();
    const onToggleEnabled = jest.fn();
    const onRemove = jest.fn();

    const kitchenPrinterConfig = {
      id: "cfg-1",
      printerName: "Kitchen",
      printerType: "KITCHEN",
      isDefault: true,
      enabled: false,
    };

    render(
      <PrinterConfigRow
        printerConfig={kitchenPrinterConfig}
        onSetDefault={onSetDefault}
        onToggleDefault={onToggleDefault}
        onToggleEnabled={onToggleEnabled}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText("cardPrinters.defaultBadge")).toBeInTheDocument();
    expect(screen.getByText("cardPrinters.disabledBadge")).toBeInTheDocument();

    expect(screen.queryByLabelText("cardPrinters.templateLabel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("cardPrinters.defaultLabel"));
    expect(onToggleDefault).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText("cardPrinters.enabledLabel"));
    expect(onToggleEnabled).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getAllByRole("button", { name: "delete" })[0]);
    expect(onRemove).toHaveBeenCalled();
  });

  it("sets default when toggled on", () => {
    const onSetDefault = jest.fn();
    const onToggleDefault = jest.fn();

    render(
      <PrinterConfigRow
        printerConfig={{
          id: "cfg-2",
          printerName: "Bar",
          printerType: "BAR",
          isDefault: false,
          enabled: true,
        }}
        onSetDefault={onSetDefault}
        onToggleDefault={onToggleDefault}
        onToggleEnabled={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText("cardPrinters.defaultLabel"));
    expect(onSetDefault).toHaveBeenCalled();
    expect(onToggleDefault).not.toHaveBeenCalled();
  });
});
