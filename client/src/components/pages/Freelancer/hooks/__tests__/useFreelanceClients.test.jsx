import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useFreelanceClients } from "../useFreelanceClients";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const hookHandlers = {};

function FreelanceClientsHookTestComponent() {
  const {
    clients,
    loading,
    error,
    forbidden,
    createFreelanceClient,
    updateFreelanceClient,
    deleteFreelanceClient,
  } = useFreelanceClients({ skipForbiddenRedirect: true });

  useEffect(() => {
    hookHandlers.createFreelanceClient = createFreelanceClient;
    hookHandlers.updateFreelanceClient = updateFreelanceClient;
    hookHandlers.deleteFreelanceClient = deleteFreelanceClient;
  }, [createFreelanceClient, updateFreelanceClient, deleteFreelanceClient]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{clients.length}</span>
      <span data-testid="first-client-name">{clients[0]?.name ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
    </div>
  );
}

describe("useFreelanceClients", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads freelance clients on mount", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([{ id: "client-1", name: "Acme" }]);

    render(<FreelanceClientsHookTestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-client-name")).toHaveTextContent("Acme");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
    expect(httpClient).toHaveBeenCalledWith("/freelance/clients", { skipForbiddenRedirect: true });
  });

  it("tracks forbidden client list responses", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });

    render(<FreelanceClientsHookTestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("creates a freelance client and refetches the list", async () => {
    const clientRequest = {
      name: "Acme",
      currencyId: "currency-1",
      hourlyRateCents: 7500,
      billingCycle: "monthly",
      paymentMethods: ["bank", "lightning"],
    };

    httpClient.mockResolvedValue({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "client-1", ...clientRequest });
    parseJsonResponse.mockResolvedValueOnce([{ id: "client-1", name: "Acme" }]);

    render(<FreelanceClientsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    let createdClient;
    await act(async () => {
      createdClient = await hookHandlers.createFreelanceClient(clientRequest);
    });

    expect(createdClient).toEqual({ id: "client-1", ...clientRequest });
    expect(httpClient).toHaveBeenCalledWith("/freelance/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(clientRequest),
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
  });

  it("updates a freelance client and refetches the list", async () => {
    const clientRequest = {
      name: "Acme Updated",
      currencyId: "currency-1",
      hourlyRateCents: 9000,
      billingCycle: "weekly",
      paymentMethods: ["lightning"],
    };

    httpClient.mockResolvedValue({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([{ id: "client-1", name: "Acme" }]);
    parseJsonResponse.mockResolvedValueOnce({ id: "client-1", ...clientRequest });
    parseJsonResponse.mockResolvedValueOnce([{ id: "client-1", name: "Acme Updated" }]);

    render(<FreelanceClientsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    let updatedClient;
    await act(async () => {
      updatedClient = await hookHandlers.updateFreelanceClient("client-1", clientRequest);
    });

    expect(updatedClient).toEqual({ id: "client-1", ...clientRequest });
    expect(httpClient).toHaveBeenCalledWith("/freelance/clients/client-1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(clientRequest),
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("first-client-name")).toHaveTextContent("Acme Updated"));
  });

  it("deletes a freelance client and refetches the list", async () => {
    httpClient.mockResolvedValue({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([{ id: "client-1", name: "Acme" }]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<FreelanceClientsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    let deleteClientResponse;
    await act(async () => {
      deleteClientResponse = await hookHandlers.deleteFreelanceClient("client-1");
    });

    expect(deleteClientResponse.ok).toBe(true);
    expect(httpClient).toHaveBeenCalledWith("/freelance/clients/client-1", {
      method: "DELETE",
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
  });

  it("throws parsed errors when client creation fails", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 400 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Invalid client" });

    render(<FreelanceClientsHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await expect(hookHandlers.createFreelanceClient({ name: "" })).rejects.toMatchObject({
      message: "Error creating freelance client",
      status: 400,
      responseMessage: "Invalid client",
    });
  });
});
