jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

import { httpClient, parseJsonResponse } from "@/lib/http";

import { getTurnOpen, openTurn, closeTurn } from "../shiftsService";

function makeResponse(status, ok = true) {
  return { status, ok };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("shiftsService", () => {
  describe("getTurnOpen", () => {
    it("returns null on 204 (no open shift)", async () => {
      httpClient.mockResolvedValue({ status: 204, ok: true });

      const result = await getTurnOpen();

      expect(result).toBeNull();
      expect(parseJsonResponse).not.toHaveBeenCalled();
    });

    it("returns the shift object on 200", async () => {
      const shift = { id: 1, shiftDate: "2026-03-04", startTime: "09:00:00" };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(shift);

      const result = await getTurnOpen();

      expect(result).toEqual(shift);
      expect(httpClient).toHaveBeenCalledWith("/shifts/open", { skipForbiddenRedirect: true });
    });

    it("returns null when parseJsonResponse returns null", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      const result = await getTurnOpen();

      expect(result).toBeNull();
    });

    it("throws when response is not ok", async () => {
      httpClient.mockResolvedValue({ status: 500, ok: false });

      await expect(getTurnOpen()).rejects.toMatchObject({
        message: "Failed to get open shift",
        status: 500,
      });
    });
  });

  describe("openTurn", () => {
    beforeEach(() => {
      httpClient.mockResolvedValue(makeResponse(201));
      parseJsonResponse.mockResolvedValue({ id: 5 });
    });

    it("sends POST to /shifts with userId and initialAmount", async () => {
      await openTurn(42, 150);

      const [url, options] = httpClient.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(url).toBe("/shifts");
      expect(options.method).toBe("POST");
      expect(options.skipForbiddenRedirect).toBe(true);
      expect(body.userId).toBe(42);
      expect(body.initialAmount).toBe(150);
    });

    it("defaults initialAmount to 0 when not provided", async () => {
      await openTurn(1);

      const body = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(body.initialAmount).toBe(0);
    });

    it("sends shiftDate as YYYY-MM-DD local date format", async () => {
      await openTurn(1, 0);

      const body = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(body.shiftDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("sends startTime as HH:mm:ss format", async () => {
      await openTurn(1, 0);

      const body = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(body.startTime).toMatch(/^\d{2}:\d{2}:\d{2}/);
    });

    it("uses local date components (not UTC toISOString) for shiftDate", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 2, 4, 20, 0, 0));

      await openTurn(1, 0);

      const body = JSON.parse(httpClient.mock.calls[0][1].body);
      const now = new Date(2026, 2, 4, 20, 0, 0);
      const expected = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      expect(body.shiftDate).toBe(expected);

      jest.useRealTimers();
    });

    it("returns the parsed response", async () => {
      const result = await openTurn(1, 0);
      expect(result).toEqual({ id: 5 });
    });
  });

  describe("closeTurn", () => {
    it("sends POST to /shifts/{id}/close with finalAmount and difference", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ closed: true });

      await closeTurn(7, 150.5, -10.2);

      const [url, options] = httpClient.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(url).toBe("/shifts/7/close");
      expect(options.method).toBe("POST");
      expect(options.skipForbiddenRedirect).toBe(true);
      expect(body.finalAmount).toBe(150.5);
      expect(body.difference).toBe(-10.2);
    });

    it("sends null amounts when not provided", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(null);

      await closeTurn(3);

      const body = JSON.parse(httpClient.mock.calls[0][1].body);
      expect(body.finalAmount).toBeNull();
      expect(body.difference).toBeNull();
    });

    it("throws when response is not ok", async () => {
      httpClient.mockResolvedValue({ status: 404, ok: false });

      await expect(closeTurn(99, null, null)).rejects.toMatchObject({
        message: "Failed to close shift",
        status: 404,
      });
    });

    it("returns the parsed response on success", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ id: 7, closed: true });

      const result = await closeTurn(7, 100, 0);

      expect(result).toEqual({ id: 7, closed: true });
    });
  });
});
