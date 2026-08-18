jest.mock("@/lib/http/httpClient", () => ({
  httpClient: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

import {
  loginWallet,
  logoutWallet,
  changeWalletPassword,
  getInfo,
  createInvoiceForCart,
  createInvoice,
  payInvoiceFromService,
  getIncomingTransactions,
  getOutgoingTransactions,
  getSeed,
  closeChannel,
} from "../walletService";

function makeResponse(status, ok = true) {
  return { status, ok };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("walletService", () => {
  describe("loginWallet", () => {
    it("calls /wallet/auth with password in body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ token: "abc" });

      await loginWallet("secret");

      expect(httpClient).toHaveBeenCalledWith("/wallet/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "secret" }),
      });
    });

    it("returns parsed response", async () => {
      const walletLoginData = { token: "abc" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(walletLoginData);

      const walletLoginResult = await loginWallet("secret");

      expect(walletLoginResult).toEqual(walletLoginData);
    });
  });

  describe("logoutWallet", () => {
    it("calls /wallet/logout with POST", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      await logoutWallet();

      expect(httpClient).toHaveBeenCalledWith("/wallet/logout", { method: "POST", skipForbiddenRedirect: true });
    });
  });

  describe("changeWalletPassword", () => {
    it("calls /wallet/password with current and new password", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ message: "Wallet password updated" });

      await changeWalletPassword({
        currentPassword: "old-secret",
        newPassword: "new-secret",
      });

      expect(httpClient).toHaveBeenCalledWith("/wallet/password", {
        method: "POST",
        skipRefresh: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "old-secret",
          newPassword: "new-secret",
        }),
      });
    });

    it("throws when password change response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(401, false));
      parseJsonResponse.mockResolvedValue({ message: "Current password is incorrect" });

      await expect(changeWalletPassword({
        currentPassword: "wrong-secret",
        newPassword: "new-secret",
      })).rejects.toMatchObject({
        message: "Current password is incorrect",
        status: 401,
      });
    });
  });

  describe("getInfo", () => {
    it("calls /wallet/getinfo", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ nodeId: "abc" });

      await getInfo();

      expect(httpClient).toHaveBeenCalledWith("/wallet/getinfo");
    });

    it("returns node info", async () => {
      const info = { nodeId: "abc123", channels: [] };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(info);

      const walletInfoResult = await getInfo();

      expect(walletInfoResult).toEqual(info);
    });

    it("throws when wallet info response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(503, false));
      parseJsonResponse.mockResolvedValue({ message: "Wallet service unavailable" });

      await expect(getInfo()).rejects.toMatchObject({
        message: "Wallet service unavailable",
        status: 503,
      });
    });
  });

  describe("createInvoiceForCart", () => {
    it("calls /wallet/invoice with correct body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ serialized: "lnbc..." });

      await createInvoiceForCart(1000, "Order #42");

      expect(httpClient).toHaveBeenCalledWith("/wallet/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Order #42", amountSat: 1000 }),
      });
    });

    it("parses amountSat as integer", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      await createInvoiceForCart("500", "desc");

      const cartInvoiceRequestBody = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(cartInvoiceRequestBody.amountSat).toBe(500);
    });

    it("returns the created invoice", async () => {
      const cartInvoice = { serialized: "lnbc...", paymentHash: "hash-abc" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(cartInvoice);

      const createdCartInvoice = await createInvoiceForCart(1000, "desc");

      expect(createdCartInvoice).toEqual(cartInvoice);
    });
  });

  describe("createInvoice", () => {
    it("calls /wallet/createinvoice with correct body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ serialized: "lnbc..." });

      await createInvoice({ amountSat: 2000, description: "Wallet invoice" });

      expect(httpClient).toHaveBeenCalledWith("/wallet/createinvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Wallet invoice",
          amountSat: 2000,
          exchangeRate: null,
          exchangeRateCurrency: null,
          fiatAmount: null,
        }),
      });
    });

    it("parses amountSat as integer", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      await createInvoice({ amountSat: "2500", description: "Wallet invoice" });

      const walletInvoiceRequestBody = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(walletInvoiceRequestBody.amountSat).toBe(2500);
    });

    it("returns the created invoice", async () => {
      const walletInvoice = { serialized: "lnbc...", paymentHash: "hash-xyz" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(walletInvoice);

      const createdWalletInvoice = await createInvoice({ amountSat: 2000, description: "desc" });

      expect(createdWalletInvoice).toEqual(walletInvoice);
    });

    it("throws when invoice creation response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({ message: "Phoenix is unavailable" });

      await expect(createInvoice({ amountSat: 2000, description: "desc" })).rejects.toMatchObject({
        message: "Phoenix is unavailable",
        status: 500,
      });
    });
  });

  describe("payInvoiceFromService", () => {
    it("calls /wallet/payinvoice with trimmed invoice", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({
        recipientAmountSat: 1000,
        routingFeeSat: 5,
        paymentHash: "hash-123",
      });

      await payInvoiceFromService("  lnbc...  ");

      const payInvoiceRequestBody = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(payInvoiceRequestBody.invoice).toBe("lnbc...");
    });

    it("uses POST method", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({
        recipientAmountSat: 1000,
        routingFeeSat: 5,
        paymentHash: "hash-123",
      });

      await payInvoiceFromService("lnbc...");

      expect(httpClient.mock.calls[0][1].method).toBe("POST");
    });

    it("throws structured error when response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(409, false));
      parseJsonResponse.mockResolvedValue({
        message: "This invoice has already been paid",
        code: "invoice_already_paid",
        source: "phoenixd",
      });

      await expect(payInvoiceFromService("lnbc...")).rejects.toMatchObject({
        message: "This invoice has already been paid",
        status: 409,
        code: "invoice_already_paid",
        source: "phoenixd",
      });
    });

    it("throws when successful response body is invalid", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ paymentHash: "" });

      await expect(payInvoiceFromService("lnbc...")).rejects.toMatchObject({
        message: "Invalid payment response",
        code: "invalid_payment_response",
      });
    });
  });

  describe("getIncomingTransactions", () => {
    it("calls /wallet/payments/incoming", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue([]);

      await getIncomingTransactions();

      expect(httpClient).toHaveBeenCalledWith("/wallet/payments/incoming");
    });

    it("returns transactions list", async () => {
      const incomingTransactions = [{ paymentId: "1" }, { paymentId: "2" }];
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(incomingTransactions);

      const incomingTransactionsResult = await getIncomingTransactions();

      expect(incomingTransactionsResult).toEqual(incomingTransactions);
    });

    it("returns empty array when response is null", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      const incomingTransactionsResult = await getIncomingTransactions();

      expect(incomingTransactionsResult).toEqual([]);
    });

    it("throws when incoming transactions response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({ message: "Incoming history failed" });

      await expect(getIncomingTransactions()).rejects.toMatchObject({
        message: "Incoming history failed",
        status: 500,
      });
    });
  });

  describe("getOutgoingTransactions", () => {
    it("calls /wallet/payments/outgoing", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue([]);

      await getOutgoingTransactions();

      expect(httpClient).toHaveBeenCalledWith("/wallet/payments/outgoing");
    });

    it("returns empty array when response is null", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      const outgoingTransactionsResult = await getOutgoingTransactions();

      expect(outgoingTransactionsResult).toEqual([]);
    });

    it("throws when outgoing transactions response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({ message: "Outgoing history failed" });

      await expect(getOutgoingTransactions()).rejects.toMatchObject({
        message: "Outgoing history failed",
        status: 500,
      });
    });
  });

  describe("getSeed", () => {
    it("calls /wallet/seed", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ seed: "word1 word2" });

      await getSeed();

      expect(httpClient).toHaveBeenCalledWith("/wallet/seed");
    });

    it("throws with the server code when the backend does not support seed export", async () => {
      httpClient.mockResolvedValue(makeResponse(501, false));
      parseJsonResponse.mockResolvedValue({
        message: "Seed export is not available with NWC backend",
        code: "unsupported_operation",
        source: "ambrosia",
      });

      await expect(getSeed()).rejects.toMatchObject({
        message: "Seed export is not available with NWC backend",
        status: 501,
        code: "unsupported_operation",
      });
    });
  });

  describe("closeChannel", () => {
    it("calls /wallet/closechannel with correct body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({});

      await closeChannel("ch-1", "bc1qxyz", 5);

      expect(httpClient).toHaveBeenCalledWith("/wallet/closechannel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: "ch-1", address: "bc1qxyz", feerateSatByte: 5 }),
      });
    });

    it("throws with server message when response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(400, false));
      parseJsonResponse.mockResolvedValue({ message: "Channel not found" });

      await expect(closeChannel("ch-1", "bc1qxyz", 5)).rejects.toThrow("Channel not found");
    });

    it("throws fallback message when server provides no message", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({});

      await expect(closeChannel("ch-1", "bc1qxyz", 5)).rejects.toThrow("Failed to close channel");
    });

    it("returns result when response is ok", async () => {
      const closeChannelResult = { status: "closed" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(closeChannelResult);

      const closedChannel = await closeChannel("ch-1", "bc1qxyz", 5);

      expect(closedChannel).toEqual(closeChannelResult);
    });
  });
});
