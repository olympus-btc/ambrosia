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
      const data = { token: "abc" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(data);

      const result = await loginWallet("secret");

      expect(result).toEqual(data);
    });
  });

  describe("logoutWallet", () => {
    it("calls /wallet/logout with POST", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      await logoutWallet();

      expect(httpClient).toHaveBeenCalledWith("/wallet/logout", { method: "POST" });
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

      const result = await getInfo();

      expect(result).toEqual(info);
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

      const body = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(body.amountSat).toBe(500);
    });

    it("returns the created invoice", async () => {
      const invoice = { serialized: "lnbc...", paymentHash: "hash-abc" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(invoice);

      const result = await createInvoiceForCart(1000, "desc");

      expect(result).toEqual(invoice);
    });
  });

  describe("createInvoice", () => {
    it("calls /wallet/createinvoice with correct body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ serialized: "lnbc..." });

      await createInvoice(2000, "Wallet invoice");

      expect(httpClient).toHaveBeenCalledWith("/wallet/createinvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Wallet invoice", amountSat: 2000 }),
      });
    });

    it("returns the created invoice", async () => {
      const invoice = { serialized: "lnbc...", paymentHash: "hash-xyz" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(invoice);

      const result = await createInvoice(2000, "desc");

      expect(result).toEqual(invoice);
    });
  });

  describe("payInvoiceFromService", () => {
    it("calls /wallet/payinvoice with trimmed invoice", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({});

      await payInvoiceFromService("  lnbc...  ");

      const body = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(body.invoice).toBe("lnbc...");
    });

    it("uses POST method", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({});

      await payInvoiceFromService("lnbc...");

      expect(httpClient.mock.calls[0][1].method).toBe("POST");
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
      const txs = [{ paymentId: "1" }, { paymentId: "2" }];
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(txs);

      const result = await getIncomingTransactions();

      expect(result).toEqual(txs);
    });

    it("returns empty array when response is null", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      const result = await getIncomingTransactions();

      expect(result).toEqual([]);
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

      const result = await getOutgoingTransactions();

      expect(result).toEqual([]);
    });
  });

  describe("getSeed", () => {
    it("calls /wallet/seed", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ seed: "word1 word2" });

      await getSeed();

      expect(httpClient).toHaveBeenCalledWith("/wallet/seed");
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
      const result = { status: "closed" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(result);

      const res = await closeChannel("ch-1", "bc1qxyz", 5);

      expect(res).toEqual(result);
    });
  });
});
