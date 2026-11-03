import { fireEvent, render, screen } from "@testing-library/react";

import { PrinterAddForm } from "../PrinterAddForm";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardBody: ({ children, ...props }) => <div {...props}>{children}</div>,
  Button: ({ onPress, isDisabled, children, ...props }) => (
    <button
      type="button"
      onClick={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      {...props}
    >
      {children}
    </button>
  ),
  Select: ({ label, children, onChange, value, selectedKeys }) => (
    <label>
      {label}
      <select
        aria-label={label}
        onChange={onChange}
        value={value ?? (selectedKeys && selectedKeys[0]) ?? ""}
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

describe("PrinterAddForm", () => {
  it("handles field updates and submit", () => {
    const onPrinterTypeChange = jest.fn();
    const onPrinterNameChange = jest.fn();
    const onDefaultChange = jest.fn();
    const onEnabledChange = jest.fn();
    const onSubmit = jest.fn();

    const formState = {
      printerType: "CUSTOMER", printerName: "",
      isDefault: false, enabled: true,
      onPrinterTypeChange, onPrinterNameChange,
      onDefaultChange, onEnabledChange, onSubmit,
    };
    const printerOptions = { availablePrinters: ["Printer A"] };
    const printerLoadingState = { available: false };

    render(<PrinterAddForm formState={formState} data={printerOptions} loading={printerLoadingState} saving={false} />);

    expect(screen.queryByLabelText("cardPrinters.templateLabel")).not.toBeInTheDocument();
    expect(screen.getByText("cardPrinters.templatesHint")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("cardPrinters.typeLabel"), {
      target: { value: "CUSTOMER" },
    });
    expect(onPrinterTypeChange).toHaveBeenCalledWith("CUSTOMER");

    fireEvent.change(screen.getByLabelText("cardPrinters.nameLabel"), {
      target: { value: "Printer A" },
    });
    expect(onPrinterNameChange).toHaveBeenCalledWith("Printer A");

    fireEvent.click(screen.getByText("cardPrinters.defaultLabel"));
    expect(onDefaultChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText("cardPrinters.enabledLabel"));
    expect(onEnabledChange).toHaveBeenCalledWith(false);

    const addButton = screen.getByText("cardPrinters.addButton");
    expect(addButton).toBeDisabled();
  });

  it("enables submit when required data is present", () => {
    const onSubmit = jest.fn();

    const formState = {
      printerType: "CUSTOMER", printerName: "Printer A",
      isDefault: false, enabled: true,
      onPrinterTypeChange: jest.fn(), onPrinterNameChange: jest.fn(),
      onDefaultChange: jest.fn(),
      onEnabledChange: jest.fn(), onSubmit,
    };
    const printerOptions = { availablePrinters: ["Printer A"] };
    const printerLoadingState = { available: false };

    render(<PrinterAddForm formState={formState} data={printerOptions} loading={printerLoadingState} saving={false} />);

    const addButton = screen.getByText("cardPrinters.addButton");
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);
    expect(onSubmit).toHaveBeenCalled();
  });
});
