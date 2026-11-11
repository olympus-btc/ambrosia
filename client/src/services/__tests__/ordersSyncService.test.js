jest.mock("@/lib/http/httpClient", () => ({
  httpClient: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

jest.mock("@/components/pages/Store/utils/buildHttpError", () => ({
  buildParsedHttpError: jest.fn(),
}));

import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

import { getOrdersSyncFindings } from "../ordersSyncService";

function makeResponse(status, ok = true) {
  return { status, ok };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ordersSyncService", () => {
  describe("getOrdersSyncFindings", () => {
    it("requests the findings endpoint with startDate and endDate as query params", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ paymentsWithoutOrder: [], misdatedOrders: [] });

      await getOrdersSyncFindings("2024-01-01", "2024-01-31");

      expect(httpClient).toHaveBeenCalledWith(
        "/wallet/orders-sync/findings?startDate=2024-01-01&endDate=2024-01-31",
      );
    });

    it("returns the parsed findings on a successful fetch", async () => {
      const findings = { paymentsWithoutOrder: [{ paymentHash: "hash-1" }], misdatedOrders: [] };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(findings);

      const returnedFindings = await getOrdersSyncFindings("2024-01-01", "2024-01-31");

      expect(returnedFindings).toEqual(findings);
    });

    it("throws a parsed HTTP error when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      const httpError = new Error("Could not load Orders Sync findings");
      buildParsedHttpError.mockResolvedValue(httpError);

      await expect(getOrdersSyncFindings("2024-01-01", "2024-01-31")).rejects.toBe(httpError);
      expect(buildParsedHttpError).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500, ok: false }),
        "Could not load Orders Sync findings",
      );
    });
  });
});
