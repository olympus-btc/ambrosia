import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

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

export const logoutWallet = async () => {
  const response = await httpClient("/wallet/logout", { method: "POST" });
  return await parseJsonResponse(response, null);
};

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

export async function getSeed() {
  const response = await httpClient("/wallet/seed");
  return await parseJsonResponse(response, null);
}

export async function closeChannel(channelId, address, feerateSatByte) {
  const response = await httpClient("/wallet/closechannel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channelId, address, feerateSatByte }),
  });
  if (!response.ok) {
    const body = await parseJsonResponse(response, {});
    throw new Error(body?.message ?? "Failed to close channel");
  }
  return await parseJsonResponse(response, null);
}
