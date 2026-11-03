import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import * as usePrintersHook from "@/components/pages/Store/hooks/usePrinter";
import { Printers } from "@/components/pages/Store/Settings/Printers/Printers";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/components/pages/Store/Cart/hooks/usePaymentMethod", () => ({
  usePaymentMethods: () => ({ paymentMethods: [{ id: "method-cash", name: "Cash" }] }),
}));

jest.mock("@/components/pages/Store/hooks/usePrinter");

let capturedProps = null;
jest.mock("@/components/pages/Store/Settings/Printers/PrintersCard", () => ({
  PrintersCard: (props) => {
    capturedProps = props;
    return (
      <button type="button" onClick={props.state?.onAdd}>
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

const { addToast } = require("@heroui/react");

beforeEach(() => {
  capturedProps = null;
  jest.clearAllMocks();
  usePrintersHook.usePrinters.mockReturnValue(defaultPrinters);
});

describe("Printers", () => {
  describe("Form initialization", () => {
    it("initializes printerName from first available printer", async () => {
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        availablePrinters: ["Printer A"],
      });

      render(<Printers />);

      await waitFor(() => expect(capturedProps?.formState?.printerName).toBe("Printer A"));
    });

    it("does not ask for a template because templates are chosen by ticket type", async () => {
      render(<Printers />);

      await waitFor(() => expect(capturedProps).not.toBeNull());
      expect(capturedProps.formState).not.toHaveProperty("templateName");
      expect(capturedProps.data).not.toHaveProperty("templates");
    });

    it("auto-sets isDefault to true when no configs exist", async () => {
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        printerConfigs: [],
        loadingConfigs: false,
      });

      render(<Printers />);

      await waitFor(() => expect(capturedProps?.formState?.isDefault).toBe(true));
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
      render(<Printers />);

      await waitFor(() => expect(capturedProps?.formState?.printerName).toBe("Printer A"));

      fireEvent.click(screen.getByText("add-printer"));

      await waitFor(() => expect(createPrinterConfig).toHaveBeenCalledWith({
        printerType: "CUSTOMER",
        printerName: "Printer A",
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

      expect(capturedProps?.data?.configRows.map((r) => r.printerName)).toEqual([
        "Bravo",
        "Alpha",
        "Zebra",
      ]);
    });
  });

  describe("handleSetDefault", () => {
    it("shows specific success toast when default printer is updated", async () => {
      const setDefaultPrinterConfig = jest.fn().mockResolvedValue({});
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        setDefaultPrinterConfig,
      });

      render(<Printers />);

      await capturedProps.state.onSetDefaultConfig("cfg-1");

      expect(setDefaultPrinterConfig).toHaveBeenCalledWith("cfg-1");
      expect(addToast).toHaveBeenCalledWith({
        description: "cardPrinters.setDefaultSuccess",
        color: "success",
      });
    });

    it("shows specific error toast when default printer update fails", async () => {
      const setDefaultPrinterConfig = jest.fn().mockRejectedValue(new Error("failed"));
      usePrintersHook.usePrinters.mockReturnValue({
        ...defaultPrinters,
        setDefaultPrinterConfig,
      });

      render(<Printers />);

      await capturedProps.state.onSetDefaultConfig("cfg-1");

      expect(setDefaultPrinterConfig).toHaveBeenCalledWith("cfg-1");
      expect(addToast).toHaveBeenCalledWith({
        description: "cardPrinters.setDefaultError",
        color: "danger",
      });
    });
  });

  it("passes the payment methods to the printers card for the cash drawer settings", () => {
    usePrintersHook.usePrinters.mockReturnValue(defaultPrinters);

    render(<Printers />);

    expect(capturedProps.data.paymentMethods).toEqual([{ id: "method-cash", name: "Cash" }]);
  });
});
