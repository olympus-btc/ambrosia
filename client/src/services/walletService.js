import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

function createWalletServiceError(message, errorDetails = {}) {
  const error = new Error(message);
  error.status = errorDetails.status;
  error.code = errorDetails.code ?? "unknown";
  error.source = errorDetails.source ?? "ambrosia";
  return error;
}

function isValidPaymentResponse(paymentResponseBody) {
  return (
    paymentResponseBody &&
    typeof paymentResponseBody.recipientAmountSat === "number" &&
    typeof paymentResponseBody.routingFeeSat === "number" &&
    typeof paymentResponseBody.paymentHash === "string" &&
    paymentResponseBody.paymentHash.trim() !== ""
  );
}

async function parseWalletResponseOrThrow(walletHttpResponse, fallbackValue, fallbackMessage) {
  const parsedWalletResponse = await parseJsonResponse(walletHttpResponse, fallbackValue);
  if (!walletHttpResponse.ok) {
    throw createWalletServiceError(
      parsedWalletResponse?.message ?? fallbackMessage,
      { status: walletHttpResponse.status },
    );
  }
  return parsedWalletResponse;
}

export const loginWallet = async (password) => {
  const walletLoginResponse = await httpClient("/wallet/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  const walletLoginBody = await parseJsonResponse(walletLoginResponse, null);
  if (!walletLoginResponse.ok) {
    throw createWalletServiceError(walletLoginBody?.message, { status: walletLoginResponse.status });
  }
  return walletLoginBody;
};

export const logoutWallet = async () => {
  const walletLogoutResponse = await httpClient("/wallet/logout", { method: "POST", skipForbiddenRedirect: true });
  return await parseJsonResponse(walletLogoutResponse, null);
};

export async function changeWalletPassword({ currentPassword, newPassword }) {
  const passwordChangeResponse = await httpClient("/wallet/password", {
    method: "POST",
    skipRefresh: true,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return await parseWalletResponseOrThrow(
    passwordChangeResponse,
    null,
    "Could not update wallet password",
  );
}

export async function getInfo() {
  const walletInfoResponse = await httpClient("/wallet/getinfo");
  return await parseWalletResponseOrThrow(
    walletInfoResponse,
    null,
    "Could not load wallet information",
  );
}

export async function getBalance() {
  const walletBalanceResponse = await httpClient("/wallet/getbalance");
  return await parseWalletResponseOrThrow(
    walletBalanceResponse,
    null,
    "Could not load wallet balance",
  );
}

export async function createInvoiceForCart(invoiceAmount, invoiceDesc) {
  const cartInvoiceResponse = await httpClient("/wallet/invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: invoiceDesc,
      amountSat: parseInt(invoiceAmount),
    }),
  });
  const cartInvoice = await parseJsonResponse(cartInvoiceResponse, null);
  if (!cartInvoiceResponse.ok) {
    throw createWalletServiceError(
      cartInvoice?.message,
      { status: cartInvoiceResponse.status },
    );
  }
  return cartInvoice;
}

export async function createInvoice({
  amountSat,
  description,
  exchangeRate = null,
  exchangeRateCurrency = null,
  fiatAmount = null,
}) {
  const createInvoiceResponse = await httpClient("/wallet/createinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description,
      amountSat: Number.parseInt(amountSat, 10),
      exchangeRate,
      exchangeRateCurrency,
      fiatAmount,
    }),
  });
  const createdInvoice = await parseJsonResponse(createInvoiceResponse, null);
  if (!createInvoiceResponse.ok) {
    throw createWalletServiceError(
      createdInvoice?.message,
      { status: createInvoiceResponse.status },
    );
  }
  return createdInvoice;
}

export async function payInvoiceFromService(invoice, amountSat, { exchangeRate = null, exchangeRateCurrency = null } = {}) {
  const payInvoiceResponse = await httpClient("/wallet/payinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice: invoice.trim(),
      ...(amountSat != null ? { amountSat } : {}),
      exchangeRate,
      exchangeRateCurrency,
    }),
  });
  const paymentResponseBody = await parseJsonResponse(payInvoiceResponse, null);

  if (!payInvoiceResponse.ok) {
    throw createWalletServiceError(
      paymentResponseBody?.message ?? "Could not process the payment",
      {
        status: payInvoiceResponse.status,
        code: paymentResponseBody?.code,
        source: paymentResponseBody?.source,
      },
    );
  }

  if (!isValidPaymentResponse(paymentResponseBody)) {
    throw createWalletServiceError(
      "Invalid payment response",
      {
        status: payInvoiceResponse.status,
        code: "invalid_payment_response",
        source: "ambrosia",
      },
    );
  }

  return paymentResponseBody;
}

export async function decodeInvoice(invoice) {
  const decodeInvoiceResponse = await httpClient("/wallet/decodeinvoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoice: invoice.trim() }),
  });
  if (!decodeInvoiceResponse.ok) {
    throw new Error("Could not decode invoice");
  }
  return await parseJsonResponse(decodeInvoiceResponse, null);
}

export async function getIncomingTransactions() {
  const incomingTransactionsResponse = await httpClient("/wallet/payments/incoming");
  const transactions = await parseWalletResponseOrThrow(
    incomingTransactionsResponse,
    [],
    "Could not load incoming transactions",
  );
  return transactions ? transactions : [];
}

export async function getOutgoingTransactions() {
  const outgoingTransactionsResponse = await httpClient("/wallet/payments/outgoing");
  const transactions = await parseWalletResponseOrThrow(
    outgoingTransactionsResponse,
    [],
    "Could not load outgoing transactions",
  );
  return transactions ? transactions : [];
}

export async function updateNwcUri(nwcUri) {
  const nwcUriUpdateResponse = await httpClient("/wallet/updatenwcuri", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nwcUri: nwcUri.trim() }),
  });
  const nwcUriUpdateBody = await parseJsonResponse(nwcUriUpdateResponse, null);
  if (!nwcUriUpdateResponse.ok) {
    throw createWalletServiceError(nwcUriUpdateBody?.message, {
      status: nwcUriUpdateResponse.status,
      code: nwcUriUpdateBody?.code,
      source: nwcUriUpdateBody?.source,
    });
  }
  return nwcUriUpdateBody;
}

export async function getSeed() {
  const seedResponse = await httpClient("/wallet/seed");
  const seedResponseBody = await parseJsonResponse(seedResponse, null);
  if (!seedResponse.ok) {
    throw createWalletServiceError(seedResponseBody?.message || "Seed not available", {
      status: seedResponse.status,
      code: seedResponseBody?.code,
      source: seedResponseBody?.source,
    });
  }
  return seedResponseBody;
}

export async function closeChannel(channelId, address, feerateSatByte) {
  const closeChannelResponse = await httpClient("/wallet/closechannel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channelId, address, feerateSatByte }),
  });
  if (!closeChannelResponse.ok) {
    const closeChannelErrorBody = await parseJsonResponse(closeChannelResponse, {});
    throw new Error(closeChannelErrorBody?.message ?? "Failed to close channel");
  }
  return await parseJsonResponse(closeChannelResponse, null);
}
