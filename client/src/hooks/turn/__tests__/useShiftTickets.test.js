import { act, renderHook, waitFor } from "@testing-library/react";

jest.mock("@/services/ticketsService", () => ({
  getTickets: jest.fn(),
  getPayments: jest.fn(),
  getPaymentMethods: jest.fn(),
  getPaymentByTicketId: jest.fn(),
}));

import {
  getTickets,
  getPayments,
  getPaymentMethods,
  getPaymentByTicketId,
} from "@/services/ticketsService";

import { useShiftTickets } from "../useShiftTickets";

const SHIFT_DATE = "2026-03-04";
const START_TIME = "08:00:00";
const shiftStartMs = new Date(`${SHIFT_DATE}T${START_TIME}`).getTime();

const toSqliteUtc = (epochMilliseconds) => new Date(epochMilliseconds).toISOString().replace("T", " ").slice(0, 19);

const ticketAfter1 = { id: 1, ticketDate: toSqliteUtc(shiftStartMs + 1000), totalAmount: 5.0 };
const ticketAfter2 = { id: 2, ticketDate: toSqliteUtc(shiftStartMs + 2000), totalAmount: 3.0 };
const ticketBefore = { id: 3, ticketDate: toSqliteUtc(shiftStartMs - 5000), totalAmount: 10.0 };

const SHIFT_DATA = { shiftDate: SHIFT_DATE, startTime: START_TIME };

beforeEach(() => {
  jest.clearAllMocks();
  getPayments.mockResolvedValue([]);
  getPaymentMethods.mockResolvedValue([]);
  getPaymentByTicketId.mockResolvedValue([]);
});

describe("useShiftTickets", () => {
  describe("when shiftData is null", () => {
    it("returns initial state without fetching", () => {
      const { result } = renderHook(() => useShiftTickets(null));
      expect(result.current.totalBalance).toBe(0);
      expect(result.current.totalTickets).toBe(0);
      expect(result.current.byPaymentMethod).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.breakdownLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(getTickets).not.toHaveBeenCalled();
    });
  });

  describe("when shiftData is provided", () => {
    it("sets loading true while fetching", async () => {
      let resolveTickets;
      getTickets.mockReturnValue(new Promise((res) => { resolveTickets = res; }));

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      expect(result.current.loading).toBe(true);

      resolveTickets([]);
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("computes totalBalance summing only tickets after shift start", async () => {
      getTickets.mockResolvedValue([ticketAfter1, ticketAfter2, ticketBefore]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalBalance).toBe(8.0);
      expect(result.current.totalTickets).toBe(2);
    });

    it("filters out tickets before shift start", async () => {
      getTickets.mockResolvedValue([ticketBefore]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalBalance).toBe(0);
      expect(result.current.totalTickets).toBe(0);
    });

    it("counts ticket at exact shift start boundary", async () => {
      const ticketAtBoundary = { id: 4, ticketDate: toSqliteUtc(shiftStartMs), totalAmount: 7.0 };
      getTickets.mockResolvedValue([ticketAtBoundary]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalTickets).toBe(1);
      expect(result.current.totalBalance).toBe(7.0);
    });

    it("filters ticket from previous shift that would appear in new shift due to UTC offset", async () => {
      const oldShiftTicket = { id: 5, ticketDate: toSqliteUtc(shiftStartMs - 240000), totalAmount: 3.0 };
      const newShiftTicket = { id: 6, ticketDate: toSqliteUtc(shiftStartMs + 60000), totalAmount: 1.0 };

      getTickets.mockResolvedValue([oldShiftTicket, newShiftTicket]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalTickets).toBe(1);
      expect(result.current.totalBalance).toBe(1.0);
    });

    it("sets error message when getTickets fails", async () => {
      getTickets.mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.error).toBe("network error"));

      expect(result.current.loading).toBe(false);
      expect(result.current.totalBalance).toBe(0);
    });

    it("uses loadError translation key when error has no message", async () => {
      getTickets.mockRejectedValue({});

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.error).toBe("loadError"));
    });

    it("refetches when ticket:created event is dispatched", async () => {
      getTickets
        .mockResolvedValueOnce([ticketAfter1])
        .mockResolvedValueOnce([ticketAfter1, ticketAfter2]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.totalTickets).toBe(1));

      act(() => {
        window.dispatchEvent(new Event("ticket:created"));
      });

      await waitFor(() => expect(result.current.totalTickets).toBe(2));
      expect(result.current.totalBalance).toBe(8.0);
      expect(getTickets).toHaveBeenCalledTimes(2);
    });

    it("does not refetch after unmount when ticket:created fires", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);

      const { result, unmount } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      unmount();
      jest.clearAllMocks();

      act(() => {
        window.dispatchEvent(new Event("ticket:created"));
      });

      expect(getTickets).not.toHaveBeenCalled();
    });

    it("computes byPaymentMethod breakdown from ticket payments", async () => {
      getTickets.mockResolvedValue([ticketAfter1, ticketAfter2]);
      getPayments.mockResolvedValue([
        { id: 10, methodId: 20 },
        { id: 11, methodId: 21 },
      ]);
      getPaymentMethods.mockResolvedValue([
        { id: 20, name: "Cash" },
        { id: 21, name: "Card" },
      ]);
      getPaymentByTicketId
        .mockResolvedValueOnce([{ paymentId: 10 }])
        .mockResolvedValueOnce([{ paymentId: 11 }]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.byPaymentMethod).toHaveLength(2));

      expect(result.current.byPaymentMethod).toEqual(
        expect.arrayContaining([
          { name: "Cash", total: 5.0 },
          { name: "Card", total: 3.0 },
        ]),
      );
    });

    it("uses 'other' translation key for unknown payment method", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockResolvedValue([{ id: 10, methodId: 99 }]);
      getPaymentMethods.mockResolvedValue([]);
      getPaymentByTicketId.mockResolvedValueOnce([{ paymentId: 10 }]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.byPaymentMethod).toHaveLength(1));

      expect(result.current.byPaymentMethod[0].name).toBe("other");
    });

    it("skips ticket with no payment records in breakdown", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockResolvedValue([{ id: 10, methodId: 20 }]);
      getPaymentMethods.mockResolvedValue([{ id: 20, name: "Cash" }]);
      getPaymentByTicketId.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.byPaymentMethod).toEqual([]);
    });

    it("sets breakdownLoading true while breakdown is in progress", async () => {
      let resolvePayments;
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockReturnValue(new Promise((res) => { resolvePayments = res; }));

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.breakdownLoading).toBe(true);

      resolvePayments([]);
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));
    });

    it("clears breakdownLoading when breakdown fails", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockRejectedValue(new Error("payments down"));

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));
    });

    it("does not affect totalBalance or totalTickets when breakdown fails", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockRejectedValue(new Error("payments down"));

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalBalance).toBe(5.0);
      expect(result.current.totalTickets).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });
});
