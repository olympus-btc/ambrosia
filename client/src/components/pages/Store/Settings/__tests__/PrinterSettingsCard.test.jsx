import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PrinterSettingsCard } from "../PrinterSettingsCard";

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

let lastAddProps = null;

jest.mock("../PrinterAddForm", () => ({
  PrinterAddForm: (props) => {
    lastAddProps = props;
    return (
      <button type="button" onClick={props.onSubmit}>
        add-form-submit
      </button>
    );
  },
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
      <button type="button" onClick={() => onTemplateChange("Updated")}>
        template-change
      </button>
      <button type="button" onClick={onSetDefault}>
        set-default
      </button>
      <button type="button" onClick={() => onToggleDefault(false)}>
        toggle-default
      </button>
      <button type="button" onClick={() => onToggleEnabled(false)}>
        toggle-enabled
      </button>
      <button type="button" onClick={onRemove}>
        remove
      </button>
    </div>
  ),
}));

jest.mock("../TicketTemplatesModal", () => ({
  TicketTemplatesModal: ({ isOpen }) =>
    isOpen ? <div>templates-modal</div> : null,
}));

const t = (key) => key;

describe("PrinterSettingsCard", () => {
  it("submits a new printer config and shows errors", async () => {
    const createPrinterConfig = jest.fn().mockResolvedValue({ id: "cfg-1" });

    render(
      <PrinterSettingsCard
        availablePrinters={["Printer A"]}
        printerConfigs={[]}
        loadingAvailable={false}
        loadingConfigs={false}
        loadingTemplates={false}
        templates={[{ name: "Template A" }]}
        error
        createPrinterConfig={createPrinterConfig}
        updatePrinterConfig={jest.fn()}
        deletePrinterConfig={jest.fn()}
        setDefaultPrinterConfig={jest.fn()}
        t={t}
      />,
    );

    expect(screen.getByText("cardPrinters.error")).toBeInTheDocument();

    await waitFor(() =>
      expect(lastAddProps?.templateName).toBe("Template A"),
    );

    fireEvent.click(screen.getByText("add-form-submit"));

    await waitFor(() =>
      expect(createPrinterConfig).toHaveBeenCalledWith({
        printerType: "KITCHEN",
        printerName: "Printer A",
        templateName: "Template A",
        isDefault: false,
        enabled: true,
      }),
    );

    expect(lastAddProps).not.toBeNull();
  });

  it("sorts config rows and opens templates modal", () => {
    render(
      <PrinterSettingsCard
        availablePrinters={[]}
        printerConfigs={[
          {
            id: "cfg-2",
            printerName: "Zebra",
            printerType: "KITCHEN",
            isDefault: false,
          },
          {
            id: "cfg-1",
            printerName: "Alpha",
            printerType: "KITCHEN",
            isDefault: true,
          },
          {
            id: "cfg-3",
            printerName: "Bravo",
            printerType: "BAR",
            isDefault: false,
          },
        ]}
        loadingAvailable={false}
        loadingConfigs={false}
        loadingTemplates={false}
        templates={[]}
        error={null}
        createPrinterConfig={jest.fn()}
        updatePrinterConfig={jest.fn()}
        deletePrinterConfig={jest.fn()}
        setDefaultPrinterConfig={jest.fn()}
        t={t}
      />,
    );

    const rows = screen.getAllByTestId(/row-/);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Bravo"),
      expect.stringContaining("Alpha"),
      expect.stringContaining("Zebra"),
    ]);

    fireEvent.click(screen.getByText("cardPrinters.manageTemplates"));
    expect(screen.getByText("templates-modal")).toBeInTheDocument();
  });

  it("updates and deletes configs from row actions", () => {
    const updatePrinterConfig = jest.fn();
    const deletePrinterConfig = jest.fn();
    const setDefaultPrinterConfig = jest.fn();

    render(
      <PrinterSettingsCard
        availablePrinters={["P1"]}
        printerConfigs={[
          {
            id: "cfg-1",
            printerName: "Alpha",
            printerType: "KITCHEN",
            isDefault: false,
          },
        ]}
        loadingAvailable={false}
        loadingConfigs={false}
        loadingTemplates={false}
        templates={[]}
        error={null}
        createPrinterConfig={jest.fn()}
        updatePrinterConfig={updatePrinterConfig}
        deletePrinterConfig={deletePrinterConfig}
        setDefaultPrinterConfig={setDefaultPrinterConfig}
        t={t}
      />,
    );

    fireEvent.click(screen.getByText("template-change"));
    expect(updatePrinterConfig).toHaveBeenCalledWith("cfg-1", {
      templateName: "Updated",
    });

    fireEvent.click(screen.getByText("toggle-default"));
    expect(updatePrinterConfig).toHaveBeenCalledWith("cfg-1", {
      isDefault: false,
    });

    fireEvent.click(screen.getByText("toggle-enabled"));
    expect(updatePrinterConfig).toHaveBeenCalledWith("cfg-1", {
      enabled: false,
    });

    fireEvent.click(screen.getByText("set-default"));
    expect(setDefaultPrinterConfig).toHaveBeenCalledWith("cfg-1");

    fireEvent.click(screen.getByText("remove"));
    expect(deletePrinterConfig).toHaveBeenCalledWith("cfg-1");
  });
});
