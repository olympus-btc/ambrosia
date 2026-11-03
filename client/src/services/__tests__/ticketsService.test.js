jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

import { httpClient, parseJsonResponse } from "@/lib/http";

import {
  getOrdersWithPayments,
  getPaymentByTicketId,
  getPaymentMethods,
  getPayments,
  getTickets,
} from "../ticketsService";

describe("ticketsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValue([]);
  });

  it("loads tickets with skipForbiddenRedirect so a 403 does not force a global redirect", async () => {
    parseJsonResponse.mockResolvedValueOnce([{ id: "ticket-1" }]);

    const tickets = await getTickets();

    expect(httpClient).toHaveBeenCalledWith("/tickets", { skipForbiddenRedirect: true });
    expect(tickets).toEqual([{ id: "ticket-1" }]);
  });

  it("falls back to an empty array when getTickets receives no body", async () => {
    parseJsonResponse.mockResolvedValueOnce(null);

    const tickets = await getTickets();

    expect(tickets).toEqual([]);
  });

  it("loads payments with skipForbiddenRedirect", async () => {
    parseJsonResponse.mockResolvedValueOnce([{ id: "payment-1" }]);

    const payments = await getPayments();

    expect(httpClient).toHaveBeenCalledWith("/payments", { skipForbiddenRedirect: true });
    expect(payments).toEqual([{ id: "payment-1" }]);
  });

  it("falls back to an empty array when getPayments receives no body", async () => {
    parseJsonResponse.mockResolvedValueOnce(null);

    const payments = await getPayments();

    expect(payments).toEqual([]);
  });

  it("loads payment methods with skipForbiddenRedirect", async () => {
    parseJsonResponse.mockResolvedValueOnce([{ id: "method-1" }]);

    const paymentMethods = await getPaymentMethods();

    expect(httpClient).toHaveBeenCalledWith("/payments/methods", { skipForbiddenRedirect: true });
    expect(paymentMethods).toEqual([{ id: "method-1" }]);
  });

  it("falls back to an empty array when getPaymentMethods receives no body", async () => {
    parseJsonResponse.mockResolvedValueOnce(null);

    const paymentMethods = await getPaymentMethods();

    expect(paymentMethods).toEqual([]);
  });

  it("loads payments for one ticket by id with skipForbiddenRedirect", async () => {
    parseJsonResponse.mockResolvedValueOnce([{ paymentId: "payment-1" }]);

    const ticketPayments = await getPaymentByTicketId("ticket-1");

    expect(httpClient).toHaveBeenCalledWith("/payments/ticket-payments/by-ticket/ticket-1", { skipForbiddenRedirect: true });
    expect(ticketPayments).toEqual([{ paymentId: "payment-1" }]);
  });

  it("returns null when getPaymentByTicketId receives no body", async () => {
    parseJsonResponse.mockResolvedValueOnce(null);

    const ticketPayments = await getPaymentByTicketId("ticket-1");

    expect(ticketPayments).toBeNull();
  });

  it("loads orders with payments with skipForbiddenRedirect", async () => {
    parseJsonResponse.mockResolvedValueOnce([{ id: "order-1" }]);

    const orders = await getOrdersWithPayments();

    expect(httpClient).toHaveBeenCalledWith("/orders/with-payments", { skipForbiddenRedirect: true });
    expect(orders).toEqual([{ id: "order-1" }]);
  });

  it("falls back to an empty array when getOrdersWithPayments receives no body", async () => {
    parseJsonResponse.mockResolvedValueOnce(null);

    const orders = await getOrdersWithPayments();

    expect(orders).toEqual([]);
  });
});
