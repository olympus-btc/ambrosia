import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import * as usePrintersHook from "../../../hooks/usePrinter";
import * as useTemplatesHook from "../../../hooks/useTemplates";
import { Printers } from "../Printers";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("../../../hooks/usePrinter");
jest.mock("../../../hooks/useTemplates");

let capturedProps = null;
jest.mock("../PrintersCard", () => ({
  PrintersCard: (props) => {
    capturedProps = props;
    return (
      <button type="button" onClick={props.onAdd}>
        add-printer
      </button>
    );
  },
}));

const defaultPrinters = {
  availablePrinters: [],
  printerConfigs: [],
  loadingAvailable: false,
  loadingConfigs: false,
  error: null,
  createPrinterConfig: jest.fn(),
  updatePrinterConfig: jest.fn(),
  deletePrinterConfig: jest.fn(),
  setDefaultPrinterConfig: jest.fn(),
};

const defaultTemplates = {
  templates: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  capturedProps = null;
  jest.clearAllMocks();
  usePrintersHook.usePrinters.mockReturnValue(defaultPrinters);
  useTemplatesHook.useTemplates.mockReturnValue(defaultTemplates);
});

describe("Printers", () => {
  describe("Form initialization", () => {
    it("initializes printerName from first available printer", async () => {
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        availablePrinters: ["Printer A"],
      });

      render(<Printers />);

      await waitFor(() => expect(capturedProps?.printerName).toBe("Printer A"));
    });

    it("initializes templateName from first template", async () => {
      useTemplatesHook.useTemplates.mockReturnValue({
        ...defaultTemplates,
        templates: [{ name: "Template A" }],
      });

      render(<Printers />);

      await waitFor(() => expect(capturedProps?.templateName).toBe("Template A"));
    });

    it("auto-sets isDefault to true when no configs exist", async () => {
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        printerConfigs: [],
        loadingConfigs: false,
      });

      render(<Printers />);

      await waitFor(() => expect(capturedProps?.isDefault).toBe(true));
    });
  });

  describe("handleAdd", () => {
    it("calls createPrinterConfig with correct args", async () => {
      const createPrinterConfig = jest.fn().mockResolvedValue({ id: "cfg-1" });
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        availablePrinters: ["Printer A"],
        createPrinterConfig,
      });
      useTemplatesHook.useTemplates.mockReturnValue({
        ...defaultTemplates,
        templates: [{ name: "Template A" }],
      });

      render(<Printers />);

      await waitFor(() => expect(capturedProps?.printerName).toBe("Printer A"));

      fireEvent.click(screen.getByText("add-printer"));

      await waitFor(() => expect(createPrinterConfig).toHaveBeenCalledWith({
        printerType: "CUSTOMER",
        printerName: "Printer A",
        templateName: "Template A",
        isDefault: true,
        enabled: true,
      }),
      );
    });
  });

  describe("configRows sorting", () => {
    it("sorts by type, then default status, then name", () => {
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        printerConfigs: [
          { id: "cfg-2", printerName: "Zebra", printerType: "KITCHEN", isDefault: false },
          { id: "cfg-1", printerName: "Alpha", printerType: "KITCHEN", isDefault: true },
          { id: "cfg-3", printerName: "Bravo", printerType: "BAR", isDefault: false },
        ],
      });

      render(<Printers />);

      expect(capturedProps?.configRows.map((r) => r.printerName)).toEqual([
        "Bravo",
        "Alpha",
        "Zebra",
      ]);
    });
  });
});
