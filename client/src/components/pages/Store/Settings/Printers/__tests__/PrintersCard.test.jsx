import { fireEvent, render, screen } from "@testing-library/react";

import { PrintersCard } from "../PrintersCard";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

jest.mock("../PrinterAddForm", () => ({
  PrinterAddForm: (props) => (
    <button type="button" onClick={props.onSubmit}>
      add-form-submit
    </button>
  ),
}));

jest.mock("../PrinterConfigRow", () => ({
  PrinterConfigRow: ({
    config,
    onTemplateChange,
    onSetDefault,
    onToggleDefault,
    onToggleEnabled,
    onRemove,
  }) => (
    <div data-testid={`row-${config.id}`}>
      {config.printerName}
      <button type="button" onClick={() => onTemplateChange("Updated")}>template-change</button>
      <button type="button" onClick={onSetDefault}>set-default</button>
      <button type="button" onClick={() => onToggleDefault(false)}>toggle-default</button>
      <button type="button" onClick={() => onToggleEnabled(false)}>toggle-enabled</button>
      <button type="button" onClick={onRemove}>remove</button>
    </div>
  ),
}));

const t = (key) => key;

const defaultProps = {
  printerType: "CUSTOMER",
  printerName: "",
  templateName: "",
  isDefault: false,
  enabled: true,
  availablePrinters: [],
  configRows: [],
  loadingAvailable: false,
  loadingConfigs: false,
  loadingTemplates: false,
  templates: [],
  error: null,
  saving: false,
  onPrinterTypeChange: jest.fn(),
  onPrinterNameChange: jest.fn(),
  onTemplateNameChange: jest.fn(),
  onDefaultChange: jest.fn(),
  onEnabledChange: jest.fn(),
  onAdd: jest.fn(),
  onUpdateConfig: jest.fn(),
  onDeleteConfig: jest.fn(),
  onSetDefaultConfig: jest.fn(),
  t,
};

describe("PrintersCard", () => {
  it("renders title and subtitle", () => {
    render(<PrintersCard {...defaultProps} />);
    expect(screen.getByText("cardPrinters.title")).toBeInTheDocument();
    expect(screen.getByText("cardPrinters.subtitle")).toBeInTheDocument();
  });

  it("shows error message when error prop is truthy", () => {
    render(<PrintersCard {...defaultProps} error />);
    expect(screen.getByText("cardPrinters.error")).toBeInTheDocument();
  });

  it("shows empty message when configRows is empty and not loading", () => {
    render(<PrintersCard {...defaultProps} configRows={[]} loadingConfigs={false} />);
    expect(screen.getByText("cardPrinters.empty")).toBeInTheDocument();
  });

  it("shows loading message when loadingConfigs is true", () => {
    render(<PrintersCard {...defaultProps} loadingConfigs />);
    expect(screen.getByText("cardPrinters.loading")).toBeInTheDocument();
  });

  it("renders a row per configRow", () => {
    const configRows = [
      { id: "cfg-1", printerName: "Alpha", printerType: "KITCHEN", isDefault: false },
      { id: "cfg-2", printerName: "Bravo", printerType: "BAR", isDefault: false },
    ];
    render(<PrintersCard {...defaultProps} configRows={configRows} />);
    expect(screen.getByTestId("row-cfg-1")).toBeInTheDocument();
    expect(screen.getByTestId("row-cfg-2")).toBeInTheDocument();
  });

  it("calls onAdd when add form is submitted", () => {
    const onAdd = jest.fn();
    render(<PrintersCard {...defaultProps} onAdd={onAdd} />);
    fireEvent.click(screen.getByText("add-form-submit"));
    expect(onAdd).toHaveBeenCalled();
  });

  it("calls onUpdateConfig, onDeleteConfig, onSetDefaultConfig from row actions", () => {
    const onUpdateConfig = jest.fn();
    const onDeleteConfig = jest.fn();
    const onSetDefaultConfig = jest.fn();
    const configRows = [{ id: "cfg-1", printerName: "Alpha", printerType: "KITCHEN", isDefault: false }];

    render(
      <PrintersCard
        {...defaultProps}
        configRows={configRows}
        onUpdateConfig={onUpdateConfig}
        onDeleteConfig={onDeleteConfig}
        onSetDefaultConfig={onSetDefaultConfig}
      />,
    );

    fireEvent.click(screen.getByText("template-change"));
    expect(onUpdateConfig).toHaveBeenCalledWith("cfg-1", { templateName: "Updated" });

    fireEvent.click(screen.getByText("toggle-default"));
    expect(onUpdateConfig).toHaveBeenCalledWith("cfg-1", { isDefault: false });

    fireEvent.click(screen.getByText("toggle-enabled"));
    expect(onUpdateConfig).toHaveBeenCalledWith("cfg-1", { enabled: false });

    fireEvent.click(screen.getByText("set-default"));
    expect(onSetDefaultConfig).toHaveBeenCalledWith("cfg-1");

    fireEvent.click(screen.getByText("remove"));
    expect(onDeleteConfig).toHaveBeenCalledWith("cfg-1");
  });
});
