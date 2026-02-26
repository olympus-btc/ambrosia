import { httpClient } from "../../lib/http/httpClient";
import { parseJsonResponse } from "../../lib/http/parseJsonResponse";
import { getPaymentByTicketId } from "../orders/ordersService";

export const loginWallet = async (password) => {
  const response = await httpClient("/wallet/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  return await parseJsonResponse(response, null);
};

export async function getTurnOpen() {
  const response = await httpClient("/shifts");
  const shifts = await parseJsonResponse(response, []);
  if (!shifts) return;
  const openShift = shifts.find((shift) => shift.end_time === null);
  return openShift ? openShift.id : null;
}

export async function openTurn() {
  const response = await httpClient("/shifts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: localStorage.getItem("userId"),
      shift_date: Date.now(),
      start_time: Date.now(),
      notes: "",
    }),
  });
  return await parseJsonResponse(response, null);
}

export async function closeTurn(openTurn) {
  const getResponse = await httpClient(`/shifts/${openTurn}`);
  const currentShift = await parseJsonResponse(getResponse, null);
  if (!currentShift) throw new Error("Turn not found");
  currentShift.end_time = Date.now();
  const updateResponse = await httpClient(`/shifts/${openTurn}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(currentShift),
  });
  return await parseJsonResponse(updateResponse, null);
}

export async function getReport(startDate, endDate) {
  const response = await httpClient(
    `/get-report?startDate=${startDate}&endDate=${endDate}`,
  );
  return await parseJsonResponse(response, null);
}

export async function getInfo() {
  const response = await httpClient("/wallet/getinfo");
  return await parseJsonResponse(response, null);
}

export async function createInvoice(invoiceAmount, invoiceDesc) {
  const response = await httpClient("/wallet/createinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: invoiceDesc,
      amountSat: parseInt(invoiceAmount),
    }),
  });
  return await parseJsonResponse(response, null);
}

export async function payInvoiceFromService(invoice) {
  const response = await httpClient("/wallet/payinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice: invoice.trim() }),
  });
  return await parseJsonResponse(response, null);
}

export async function getIncomingTransactions() {
  const response = await httpClient("/wallet/payments/incoming");
  const transactions = await parseJsonResponse(response, []);
  return transactions ? transactions : [];
}
export async function getOutgoingTransactions() {
  const response = await httpClient("/wallet/payments/outgoing");
  const transactions = await parseJsonResponse(response, []);
  return transactions ? transactions : [];
}

export const logoutWallet = async () => {
  const response = await httpClient("/wallet/logout", { method: "POST" });
  return await parseJsonResponse(response, null);
};

export async function generateReportFromData(
  startDate,
  endDate,
  { tickets, orders, payments, paymentMethods },
) {
  const start = parseLocalDate(startDate, true);
  const end = parseLocalDate(endDate, false);

  const filteredTickets = tickets.filter((ticket) => {
    const ticketDate = new Date(Number(ticket.ticket_date));
    return ticketDate >= start && ticketDate <= end;
  });

  const reportsByDate = {};

  for (const ticket of filteredTickets) {
    const date = formatTimeStamp(ticket.ticket_date);

    const order = orders.find((o) => o.id === ticket.order_id);
    const userName = order?.waiter || "Desconocido";

    const ticketPayment = await getPaymentByTicketId(ticket.id);
    const payment = payments.find((p) => p.id === ticketPayment[0].payment_id);
    const paymentMethodName = paymentMethods.find(
      (method) => method.id === payment.method_id,
    ).name;
    const ticketInfo = {
      amount: ticket.total_amount,
      paymentMethod: paymentMethodName,
      userName,
    };

    if (!reportsByDate[date]) {
      reportsByDate[date] = {
        date,
        balance: 0,
        tickets: [],
      };
    }

    reportsByDate[date].balance += ticket.total_amount;
    reportsByDate[date].tickets.push(ticketInfo);
  }

  const reports = Object.values(reportsByDate);
  const totalBalance = reports.reduce((sum, r) => sum + r.balance, 0);

  return {
    startDate,
    endDate,
    totalBalance,
    reports,
  };
}

function parseLocalDate(dateStr, isStart = true) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    isStart ? 0 : 23,
    isStart ? 0 : 59,
    isStart ? 0 : 59,
    isStart ? 0 : 999,
  );
}

function formatTimeStamp(timestamp) {
  const date = new Date(Number(timestamp));
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
