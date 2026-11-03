import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useFreelanceInvoices } from "../useFreelanceInvoices";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const hookHandlers = {};

function FreelanceInvoicesHookTestComponent() {
  const {
    invoices,
    selectedInvoice,
    loading,
    error: loadError,
    forbidden,
    fetchInvoiceDetail,
    createFreelanceInvoice,
    previewFreelanceInvoice,
  } = useFreelanceInvoices({ skipForbiddenRedirect: true });

  useEffect(() => {
    hookHandlers.fetchInvoiceDetail = fetchInvoiceDetail;
    hookHandlers.createFreelanceInvoice = createFreelanceInvoice;
    hookHandlers.previewFreelanceInvoice = previewFreelanceInvoice;
  }, [fetchInvoiceDetail, createFreelanceInvoice, previewFreelanceInvoice]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{invoices.length}</span>
      <span data-testid="first-invoice-number">{invoices[0]?.invoiceNumber ?? ""}</span>
      <span data-testid="selected-invoice-number">{selectedInvoice?.invoiceNumber ?? ""}</span>
      <span data-testid="error">{loadError ? "yes" : "no"}</span>
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
    </div>
  );
}

describe("useFreelanceInvoices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads freelance invoices on mount", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([{ id: "invoice-1", invoiceNumber: "2026-0001" }]);

    render(<FreelanceInvoicesHookTestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-invoice-number")).toHaveTextContent("2026-0001");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
    expect(httpClient).toHaveBeenCalledWith("/freelance/invoices", { skipForbiddenRedirect: true });
  });

  it("tracks forbidden invoice list responses", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });

    render(<FreelanceInvoicesHookTestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("loads invoice details", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce({ id: "invoice-1", invoiceNumber: "2026-0001" });

    render(<FreelanceInvoicesHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    let invoiceDetail;
    await act(async () => {
      invoiceDetail = await hookHandlers.fetchInvoiceDetail("invoice-1");
    });

    expect(invoiceDetail).toEqual({ id: "invoice-1", invoiceNumber: "2026-0001" });
    expect(screen.getByTestId("selected-invoice-number")).toHaveTextContent("2026-0001");
    expect(httpClient).toHaveBeenCalledWith("/freelance/invoices/invoice-1", {
      skipForbiddenRedirect: true,
    });
  });

  it("creates a freelance invoice and refetches the list", async () => {
    const invoiceRequest = {
      clientId: "client-1",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      payoutAccountId: "payout-1",
    };

    httpClient.mockResolvedValue({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "invoice-1", invoiceNumber: "2026-0001" });
    parseJsonResponse.mockResolvedValueOnce([{ id: "invoice-1", invoiceNumber: "2026-0001" }]);

    render(<FreelanceInvoicesHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    let createdInvoice;
    await act(async () => {
      createdInvoice = await hookHandlers.createFreelanceInvoice(invoiceRequest);
    });

    expect(createdInvoice).toEqual({ id: "invoice-1", invoiceNumber: "2026-0001" });
    expect(httpClient).toHaveBeenCalledWith("/freelance/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceRequest),
      skipForbiddenRedirect: true,
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
  });

  it("previews a freelance invoice without refetching the list", async () => {
    const invoiceRequest = {
      clientId: "client-1",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      payoutAccountId: "payout-1",
    };

    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce({ totalCents: 10_000, lineItems: [{ projectName: "Website" }] });

    render(<FreelanceInvoicesHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    let invoicePreview;
    await act(async () => {
      invoicePreview = await hookHandlers.previewFreelanceInvoice(invoiceRequest);
    });

    expect(invoicePreview).toEqual({ totalCents: 10_000, lineItems: [{ projectName: "Website" }] });
    expect(httpClient).toHaveBeenCalledWith("/freelance/invoices/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceRequest),
      skipForbiddenRedirect: true,
    });
    expect(httpClient).toHaveBeenCalledTimes(2);
  });

  it("throws parsed errors when invoice creation fails", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseJsonResponse.mockResolvedValueOnce([]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 400 });
    parseJsonResponse.mockResolvedValueOnce({ message: "No billable entries" });

    render(<FreelanceInvoicesHookTestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await expect(hookHandlers.createFreelanceInvoice({ clientId: "client-1" })).rejects.toMatchObject({
      message: "Error creating freelance invoice",
      status: 400,
      responseMessage: "No billable entries",
    });
  });
});
