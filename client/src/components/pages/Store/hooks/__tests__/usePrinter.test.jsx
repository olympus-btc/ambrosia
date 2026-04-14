import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { usePrinters } from "../usePrinter";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
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
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads printers and configs on mount", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce(["Printer A"]);
    parseJsonResponse.mockResolvedValueOnce([{ id: "cfg-1" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("loading-configs")).toHaveTextContent("no");
    expect(screen.getByTestId("available-count")).toHaveTextContent("1");
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("sets empty lists when apiClient returns non-array values", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("available-count")).toHaveTextContent("0");
    expect(screen.getByTestId("config-count")).toHaveTextContent("0");
  });

  it("sets error when fetching printers fails", async () => {
    httpClient
      .mockRejectedValueOnce(new Error("fail-available"))
      .mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("creates a printer config and appends it", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "cfg-9" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("config-count")).toHaveTextContent("0"),
    );

    await act(async () => {
      await handlers.createPrinterConfig({
        printerName: "Front",
        printerType: "KITCHEN",
      });
    });

    expect(httpClient).toHaveBeenCalledWith("/printers/configs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ printerName: "Front", printerType: "KITCHEN" }),
    });
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("updates a printer config in state", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "Old", printerType: "KITCHEN" },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("first-config-name")).toHaveTextContent("Old"),
    );

    await act(async () => {
      await handlers.updatePrinterConfig("cfg-1", { printerName: "New" });
    });

    expect(httpClient).toHaveBeenCalledWith("/printers/configs/cfg-1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ printerName: "New" }),
    });
    expect(screen.getByTestId("first-config-name")).toHaveTextContent("New");
  });

  it("deletes a printer config from state", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "A" },
      { id: "cfg-2", printerName: "B" },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("config-count")).toHaveTextContent("2"),
    );

    await act(async () => {
      await handlers.deletePrinterConfig("cfg-1");
    });

    expect(httpClient).toHaveBeenCalledWith("/printers/configs/cfg-1", {
      method: "DELETE",
    });
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("sets default printer config for a type", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "A", printerType: "KITCHEN", isDefault: true },
      { id: "cfg-2", printerName: "B", printerType: "KITCHEN", isDefault: false },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-1"),
    );

    await act(async () => {
      await handlers.setDefaultPrinterConfig("cfg-2");
    });

    expect(httpClient).toHaveBeenCalledWith("/printers/configs/cfg-2/default", {
      method: "POST",
    });
    expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-2");
  });

  it("validates required args when setting default by name", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-configs")).toHaveTextContent("no"),
    );

    await expect(handlers.setDefaultPrinterByName()).rejects.toThrow(
      "printerType and printerName are required",
    );
  });

  it("prints a ticket with the provided body", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );

    await act(async () => {
      await handlers.printTicket({ ticketId: "t-1" });
    });

    expect(httpClient).toHaveBeenCalledWith("/printers/print", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticketId: "t-1" }),
    });
  });

  it("refetches all printer data", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse
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

    expect(httpClient).toHaveBeenCalledWith("/printers/available");
    expect(httpClient).toHaveBeenCalledWith("/printers/configs");
    expect(screen.getByTestId("available-count")).toHaveTextContent("1");
    expect(screen.getByTestId("config-count")).toHaveTextContent("1");
  });

  it("handles update errors and missing config id", async () => {
    httpClient
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("update-fail"));
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );

    await expect(handlers.updatePrinterConfig()).rejects.toThrow(
      "config Id is required",
    );

    await expect(
      handlers.updatePrinterConfig("cfg-1", { printerName: "X" }),
    ).rejects.toThrow("update-fail");

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("yes"),
    );
  });

  it("handles delete, default, and print errors", async () => {
    httpClient
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("delete-fail"))
      .mockRejectedValueOnce(new Error("default-fail"))
      .mockRejectedValueOnce(new Error("print-fail"));
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading-available")).toHaveTextContent("no"),
    );

    await expect(handlers.deletePrinterConfig()).rejects.toThrow(
      "config Id is required",
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
    httpClient
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("set-name-fail"));
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([]);

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
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([
      { id: "cfg-1", printerName: "A", printerType: "KITCHEN", isDefault: true },
    ]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-1"),
    );

    await act(async () => {
      await handlers.setDefaultPrinterConfig("missing");
    });

    expect(screen.getByTestId("default-kitchen")).toHaveTextContent("cfg-1");
  });
});
