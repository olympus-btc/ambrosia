import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getTickets() {
  const response = await httpClient("/tickets");
  const tickets = await parseJsonResponse(response, []);
  return tickets ?? [];
}

export async function getPayments() {
  const response = await httpClient("/payments");
  const payments = await parseJsonResponse(response, []);
  return payments ?? [];
}

export async function getPaymentMethods() {
  const response = await httpClient("/payments/methods");
  const methods = await parseJsonResponse(response, []);
  return methods ?? [];
}

export async function getPaymentByTicketId(id) {
  const response = await httpClient(`/payments/ticket-payments/by-ticket/${id}`);
  return await parseJsonResponse(response, null);
}
