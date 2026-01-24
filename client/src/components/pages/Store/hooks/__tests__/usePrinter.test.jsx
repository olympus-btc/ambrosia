import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { apiClient } from "@/services/apiClient";

import { usePrinters } from "../usePrinter";

jest.mock("@/services/apiClient", () => ({
  apiClient: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const {
    availablePrinters,
    printerConfigs,
    loadingAvailable,
    loadingConfigs,
    error,
    createPrinterConfig,
    updatePrinterConfig,
    deletePrinterConfig,
    setDefaultPrinterConfig,
    setDefaultPrinterByName,
    printTicket,
    refetchAll,
  } = usePrinters();

  useEffect(() => {
    handlers.createPrinterConfig = createPrinterConfig;
    handlers.updatePrinterConfig = updatePrinterConfig;
    handlers.deletePrinterConfig = deletePrinterConfig;
    handlers.setDefaultPrinterConfig = setDefaultPrinterConfig;
    handlers.setDefaultPrinterByName = setDefaultPrinterByName;
    handlers.printTicket = printTicket;
    handlers.refetchAll = refetchAll;
  }, [
    createPrinterConfig,
    updatePrinterConfig,
    deletePrinterConfig,
    setDefaultPrinterConfig,
    setDefaultPrinterByName,
    printTicket,
    refetchAll,
  ]);

  const defaultKitchen =
    printerConfigs.find(
      (config) => config.printerType === "KITCHEN" && config.isDefault,
    )?.id ?? "";

  return (
    <div>
      <span data-testid="loading-available">
        {loadingAvailable ? "yes" : "no"}
      </span>
      <span data-testid="loading-configs">
        {loadingConfigs ? "yes" : "no"}
      </span>
      <span data-testid="available-count">{availablePrinters.length}</span>
      <span data-testid="config-count">{printerConfigs.length}</span>
      <span data-testid="first-config-name">
        {printerConfigs[0]?.printerName ?? ""}
      </span>
      <span data-testid="default-kitchen">{defaultKitchen}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("usePrinters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads printers and configs on mount", async () => {
    apiClient.mockResolvedValueOnce(["Printer A"]);
    apiClient.mockResolvedValueOnce([{ id: "cfg-1" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("loading-configs")).toHaveTextContent("no");
    expect(screen.getByTestId("available-count")).toHaveTextContent("1");
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("sets empty lists when apiClient returns non-array values", async () => {
    apiClient.mockResolvedValueOnce({ ok: true });
    apiClient.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("available-count")).toHaveTextContent("0");
    expect(screen.getByTestId("config-count")).toHaveTextContent("0");
  });

  it("sets error when fetching printers fails", async () => {
    apiClient.mockRejectedValueOnce(new Error("fail-available"));
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("creates a printer config and appends it", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ id: "cfg-9" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("config-count")).toHaveTextContent("0"),
    );

    await act(async () => {
      await handlers.createPrinterConfig({
        printerName: "Front",
        printerType: "KITCHEN",
      });
    });

    expect(apiClient).toHaveBeenCalledWith("/printers/configs", {
      method: "POST",
      body: { printerName: "Front", printerType: "KITCHEN" },
    });
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("updates a printer config in state", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "Old", printerType: "KITCHEN" },
    ]);
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("first-config-name")).toHaveTextContent("Old"),
    );

    await act(async () => {
      await handlers.updatePrinterConfig("cfg-1", { printerName: "New" });
    });

    expect(apiClient).toHaveBeenCalledWith("/printers/configs/cfg-1", {
      method: "PUT",
      body: { printerName: "New" },
    });
    expect(screen.getByTestId("first-config-name")).toHaveTextContent("New");
  });

  it("deletes a printer config from state", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "A" },
      { id: "cfg-2", printerName: "B" },
    ]);
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("config-count")).toHaveTextContent("2"),
    );

    await act(async () => {
      await handlers.deletePrinterConfig("cfg-1");
    });

    expect(apiClient).toHaveBeenCalledWith("/printers/configs/cfg-1", {
      method: "DELETE",
    });
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("sets default printer config for a type", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "A", printerType: "KITCHEN", isDefault: true },
      { id: "cfg-2", printerName: "B", printerType: "KITCHEN", isDefault: false },
    ]);
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-1"),
    );

    await act(async () => {
      await handlers.setDefaultPrinterConfig("cfg-2");
    });

    expect(apiClient).toHaveBeenCalledWith("/printers/configs/cfg-2/default", {
      method: "POST",
    });
    expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-2");
  });

  it("validates required args when setting default by name", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-configs")).toHaveTextContent("no"),
    );

    await expect(handlers.setDefaultPrinterByName()).rejects.toThrow(
      "printerType and printerName are required",
    );
  });

  it("prints a ticket with the provided body", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );

    await act(async () => {
      await handlers.printTicket({ ticketId: "t-1" });
    });

    expect(apiClient).toHaveBeenCalledWith("/printers/print", {
      method: "POST",
      body: { ticketId: "t-1" },
    });
  });

  it("refetches all printer data", async () => {
    apiClient
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["Printer B"])
      .mockResolvedValueOnce([{ id: "cfg-10" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-configs")).toHaveTextContent("no"),
    );

    await act(async () => {
      await handlers.refetchAll();
    });

    expect(apiClient).toHaveBeenCalledWith("/printers/available");
    expect(apiClient).toHaveBeenCalledWith("/printers/configs");
    expect(screen.getByTestId("available-count")).toHaveTextContent("1");
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("handles update errors and missing config id", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockRejectedValueOnce(new Error("update-fail"));

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );

    await expect(handlers.updatePrinterConfig()).rejects.toThrow(
      "configId is required",
    );

    await expect(
      handlers.updatePrinterConfig("cfg-1", { printerName: "X" }),
    ).rejects.toThrow("update-fail");

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("yes"),
    );
  });

  it("handles delete, default, and print errors", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([]);
    apiClient
      .mockRejectedValueOnce(new Error("delete-fail"))
      .mockRejectedValueOnce(new Error("default-fail"))
      .mockRejectedValueOnce(new Error("print-fail"));

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );

    await expect(handlers.deletePrinterConfig()).rejects.toThrow(
      "configId is required",
    );
    await expect(handlers.deletePrinterConfig("cfg-1")).rejects.toThrow(
      "delete-fail",
    );

    await expect(handlers.setDefaultPrinterConfig()).rejects.toThrow(
      "configId is required",
    );
    await expect(handlers.setDefaultPrinterConfig("cfg-1")).rejects.toThrow(
      "default-fail",
    );

    await expect(handlers.printTicket({ id: "t-1" })).rejects.toThrow(
      "print-fail",
    );

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("yes"),
    );
  });

  it("handles setDefaultPrinterByName errors", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockRejectedValueOnce(new Error("set-name-fail"));

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );

    await expect(
      handlers.setDefaultPrinterByName("KITCHEN", "Printer A"),
    ).rejects.toThrow("set-name-fail");

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("yes"),
    );
  });

  it("keeps defaults when config id is not found", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "A", printerType: "KITCHEN", isDefault: true },
    ]);
    apiClient.mockResolvedValueOnce({ ok: true });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-1"),
    );

    await act(async () => {
      await handlers.setDefaultPrinterConfig("missing");
    });

    expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-1");
  });
});
