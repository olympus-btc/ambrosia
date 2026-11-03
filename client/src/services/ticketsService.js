import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getTickets() {
  const ticketsResponse = await httpClient("/tickets", { skipForbiddenRedirect: true });
  const tickets = await parseJsonResponse(ticketsResponse, []);
  return tickets ?? [];
}

export async function getPayments() {
  const paymentsResponse = await httpClient("/payments", { skipForbiddenRedirect: true });
  const payments = await parseJsonResponse(paymentsResponse, []);
  return payments ?? [];
}

export async function getPaymentMethods() {
  const paymentMethodsResponse = await httpClient("/payments/methods", { skipForbiddenRedirect: true });
  const paymentMethods = await parseJsonResponse(paymentMethodsResponse, []);
  return paymentMethods ?? [];
}

export async function getPaymentByTicketId(id) {
  const ticketPaymentsResponse = await httpClient(`/payments/ticket-payments/by-ticket/${id}`, { skipForbiddenRedirect: true });
  return await parseJsonResponse(ticketPaymentsResponse, null);
}

export async function getOrdersWithPayments() {
  const ordersResponse = await httpClient("/orders/with-payments", { skipForbiddenRedirect: true });
  const orders = await parseJsonResponse(ordersResponse, []);
  return orders ?? [];
}
