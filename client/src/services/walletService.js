import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

function createWalletServiceError(message, errorDetails = {}) {
  const error = new Error(message);
  error.status = errorDetails.status;
  error.code = errorDetails.code ?? "unknown";
  error.source = errorDetails.source ?? "ambrosia";
  return error;
}

function isValidPaymentResponse(responseBody) {
  return (
    responseBody &&
    typeof responseBody.recipientAmountSat === "number" &&
    typeof responseBody.routingFeeSat === "number" &&
    typeof responseBody.paymentHash === "string" &&
    responseBody.paymentHash.trim() !== ""
  );
}

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

export async function createInvoiceForCart(invoiceAmount, invoiceDesc) {
  const response = await httpClient("/wallet/invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: invoiceDesc,
      amountSat: parseInt(invoiceAmount),
    }),
  });
  const invoice = await parseJsonResponse(response, null);
  if (!response.ok) {
    throw createWalletServiceError(
      invoice?.message,
      { status: response.status },
    );
  }
  return invoice;
}

export async function createInvoice({
  amountSat,
  description,
}) {
  const response = await httpClient("/wallet/createinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description,
      amountSat: Number.parseInt(amountSat, 10),
    }),
  });
  return await parseJsonResponse(response, null);
}

export async function payInvoiceFromService(invoice, amountSat) {
  const response = await httpClient("/wallet/payinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice: invoice.trim(), ...(amountSat != null ? { amountSat } : {}) }),
  });
  const responseBody = await parseJsonResponse(response, null);

  if (!response.ok) {
    throw createWalletServiceError(
      responseBody?.message ?? "Could not process the payment",
      {
        status: response.status,
        code: responseBody?.code,
        source: responseBody?.source,
      },
    );
  }

  if (!isValidPaymentResponse(responseBody)) {
    throw createWalletServiceError(
      "Invalid payment response",
      {
        status: response.status,
        code: "invalid_payment_response",
        source: "ambrosia",
      },
    );
  }

  return responseBody;
}

export async function decodeInvoice(invoice) {
  const response = await httpClient("/wallet/decodeinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice: invoice.trim() }),
  });
  if (!response.ok) {
    throw new Error("Could not decode invoice");
  }
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
