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

import { useShiftTicketMetrics } from "../useShiftTicketMetrics";

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

describe("useShiftTicketMetrics", () => {
  describe("when openShiftData is null", () => {
    it("returns initial state without fetching", () => {
      const { result } = renderHook(() => useShiftTicketMetrics(null));
      expect(result.current.totalBalance).toBe(0);
      expect(result.current.totalTickets).toBe(0);
      expect(result.current.byPaymentMethod).toEqual([]);
      expect(result.current.ticketsLoading).toBe(false);
      expect(result.current.breakdownLoading).toBe(false);
      expect(getTickets).not.toHaveBeenCalled();
    });
  });

  describe("when openShiftData is provided", () => {
    it("sets ticketsLoading true while fetching", async () => {
      let resolveTickets;
      getTickets.mockReturnValue(new Promise((res) => { resolveTickets = res; }));

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      expect(result.current.ticketsLoading).toBe(true);

      resolveTickets([]);
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));
    });

    it("computes totalBalance summing only tickets after shift start", async () => {
      getTickets.mockResolvedValue([ticketAfter1, ticketAfter2, ticketBefore]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalBalance).toBe(8.0);
      expect(result.current.totalTickets).toBe(2);
    });

    it("filters out tickets before shift start", async () => {
      getTickets.mockResolvedValue([ticketBefore]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalBalance).toBe(0);
      expect(result.current.totalTickets).toBe(0);
    });

    it("counts ticket at exact shift start boundary", async () => {
      const ticketAtBoundary = { id: 4, ticketDate: toSqliteUtc(shiftStartMs), totalAmount: 7.0 };
      getTickets.mockResolvedValue([ticketAtBoundary]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalTickets).toBe(1);
      expect(result.current.totalBalance).toBe(7.0);
    });

    it("filters ticket from previous shift that would appear in new shift due to UTC offset", async () => {
      const oldShiftTicket = { id: 5, ticketDate: toSqliteUtc(shiftStartMs - 240000), totalAmount: 3.0 };
      const newShiftTicket = { id: 6, ticketDate: toSqliteUtc(shiftStartMs + 60000), totalAmount: 1.0 };

      getTickets.mockResolvedValue([oldShiftTicket, newShiftTicket]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalTickets).toBe(1);
      expect(result.current.totalBalance).toBe(1.0);
    });

    it("continues silently when getTickets fails", async () => {
      getTickets.mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalBalance).toBe(0);
      expect(result.current.totalTickets).toBe(0);
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

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
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

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.byPaymentMethod).toHaveLength(1));

      expect(result.current.byPaymentMethod[0].name).toBe("other");
    });

    it("skips ticket with no payment records in breakdown", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockResolvedValue([{ id: 10, methodId: 20 }]);
      getPaymentMethods.mockResolvedValue([{ id: 20, name: "Cash" }]);
      getPaymentByTicketId.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.byPaymentMethod).toEqual([]);
    });

    it("sets breakdownLoading true while breakdown is in progress", async () => {
      let resolvePayments;
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockReturnValue(new Promise((res) => { resolvePayments = res; }));

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.breakdownLoading).toBe(true);

      resolvePayments([]);
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));
    });

    it("clears breakdownLoading when breakdown fails", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockRejectedValue(new Error("payments down"));

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));
    });

    it("does not affect totalBalance or totalTickets when breakdown fails", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockRejectedValue(new Error("payments down"));

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalBalance).toBe(5.0);
      expect(result.current.totalTickets).toBe(1);
    });

    it("reset clears all metrics to initial state", async () => {
      getTickets.mockResolvedValue([ticketAfter1, ticketAfter2]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.totalTickets).toBe(2));

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.totalBalance).toBe(0);
        expect(result.current.totalTickets).toBe(0);
        expect(result.current.byPaymentMethod).toEqual([]);
      });
    });
  });
});
