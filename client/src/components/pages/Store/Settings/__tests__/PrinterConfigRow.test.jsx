import { fireEvent, render, screen } from "@testing-library/react";

import { PrinterConfigRow } from "../PrinterSettings/PrinterConfigRow";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
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
        onChange={(e) => onValueChange(e.target.checked)}
      />
      {children}
    </label>
  ),
}));

const t = (key) => key;

describe("PrinterConfigRow", () => {
  it("renders badges and handles actions", () => {
    const onTemplateChange = jest.fn();
    const onSetDefault = jest.fn();
    const onToggleDefault = jest.fn();
    const onToggleEnabled = jest.fn();
    const onRemove = jest.fn();

    const config = {
      id: "cfg-1",
      printerName: "Kitchen",
      printerType: "KITCHEN",
      templateName: "Temp A",
      isDefault: true,
      enabled: false,
    };

    render(
      <PrinterConfigRow
        config={config}
        templates={[{ name: "Temp A" }, { name: "Temp B" }]}
        loadingTemplates={false}
        onTemplateChange={onTemplateChange}
        onSetDefault={onSetDefault}
        onToggleDefault={onToggleDefault}
        onToggleEnabled={onToggleEnabled}
        onRemove={onRemove}
        t={t}
      />,
    );

    expect(screen.getByText("cardPrinters.defaultBadge")).toBeInTheDocument();
    expect(screen.getByText("cardPrinters.disabledBadge")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("cardPrinters.templateLabel"), {
      target: { value: "" },
    });
    expect(onTemplateChange).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getByText("cardPrinters.defaultLabel"));
    expect(onToggleDefault).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText("cardPrinters.enabledLabel"));
    expect(onToggleEnabled).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText("cardPrinters.remove"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("sets default when toggled on", () => {
    const onSetDefault = jest.fn();
    const onToggleDefault = jest.fn();

    render(
      <PrinterConfigRow
        config={{
          id: "cfg-2",
          printerName: "Bar",
          printerType: "BAR",
          templateName: null,
          isDefault: false,
          enabled: true,
        }}
        templates={[]}
        loadingTemplates={false}
        onTemplateChange={jest.fn()}
        onSetDefault={onSetDefault}
        onToggleDefault={onToggleDefault}
        onToggleEnabled={jest.fn()}
        onRemove={jest.fn()}
        t={t}
      />,
    );

    fireEvent.click(screen.getByText("cardPrinters.defaultLabel"));
    expect(onSetDefault).toHaveBeenCalled();
    expect(onToggleDefault).not.toHaveBeenCalled();
  });
});
