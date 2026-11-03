import { act, renderHook, waitFor } from "@testing-library/react";

jest.mock("@/services/ticketsService", () => ({
  getTickets: jest.fn(),
  getPayments: jest.fn(),
  getPaymentMethods: jest.fn(),
  getPaymentByTicketId: jest.fn(),
  getOrdersWithPayments: jest.fn(),
}));

import {
  getTickets,
  getPayments,
  getPaymentMethods,
  getPaymentByTicketId,
  getOrdersWithPayments,
} from "@/services/ticketsService";

import { useShiftTicketMetrics } from "../useShiftTicketMetrics";

const SHIFT_DATE = "2026-03-04";
const START_TIME = "08:00:00";
const shiftStartMilliseconds = new Date(`${SHIFT_DATE}T${START_TIME}`).getTime();

const toLocalNaive = (epochMilliseconds) => {
  const date = new Date(epochMilliseconds);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const ticketAfter1 = { id: 1, ticketDate: toLocalNaive(shiftStartMilliseconds + 1000), totalAmount: 5.0 };
const ticketAfter2 = { id: 2, ticketDate: toLocalNaive(shiftStartMilliseconds + 2000), totalAmount: 3.0 };
const ticketBefore = { id: 3, ticketDate: toLocalNaive(shiftStartMilliseconds - 5000), totalAmount: 10.0 };

const SHIFT_DATA = { shiftDate: SHIFT_DATE, startTime: START_TIME };

beforeEach(() => {
  jest.clearAllMocks();
  getPayments.mockResolvedValue([]);
  getPaymentMethods.mockResolvedValue([]);
  getPaymentByTicketId.mockResolvedValue([]);
  getOrdersWithPayments.mockResolvedValue([]);
});

describe("useShiftTicketMetrics", () => {
  describe("when openShiftData is null", () => {
    it("returns initial state without fetching", () => {
      const { result } = renderHook(() => useShiftTicketMetrics(null));
      expect(result.current.totalBalance).toBe(0);
      expect(result.current.totalTips).toBe(0);
      expect(result.current.cashTotal).toBe(0);
      expect(result.current.refundedCashTotal).toBe(0);
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
      const ticketAtBoundary = { id: 4, ticketDate: toLocalNaive(shiftStartMilliseconds), totalAmount: 7.0 };
      getTickets.mockResolvedValue([ticketAtBoundary]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalTickets).toBe(1);
      expect(result.current.totalBalance).toBe(7.0);
    });

    it("excludes a ticket from before shift start when a ticket from after shift start is also present", async () => {
      const oldShiftTicket = { id: 5, ticketDate: toLocalNaive(shiftStartMilliseconds - 240000), totalAmount: 3.0 };
      const newShiftTicket = { id: 6, ticketDate: toLocalNaive(shiftStartMilliseconds + 60000), totalAmount: 1.0 };

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

    it("computes cashTotal summing only tickets paid in cash", async () => {
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

      expect(result.current.cashTotal).toBe(5.0);
    });

    it("cashTotal is 0 when no tickets were paid in cash", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockResolvedValue([{ id: 10, methodId: 21 }]);
      getPaymentMethods.mockResolvedValue([{ id: 21, name: "Card" }]);
      getPaymentByTicketId.mockResolvedValueOnce([{ paymentId: 10 }]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.byPaymentMethod).toHaveLength(1));

      expect(result.current.cashTotal).toBe(0);
    });

    it("computes refundedCashTotal summing only cash orders refunded during the shift", async () => {
      getTickets.mockResolvedValue([]);
      getOrdersWithPayments.mockResolvedValue([
        { paymentMethod: "Cash", total: 15.0, discountAmount: 0, refund: { refundedAt: toLocalNaive(shiftStartMilliseconds + 1000) } },
        { paymentMethod: "Cash", total: 8.0, discountAmount: 0, refund: { refundedAt: toLocalNaive(shiftStartMilliseconds + 2000) } },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));

      expect(result.current.refundedCashTotal).toBe(23.0);
    });

    it("subtracts the discount from the order total when computing refundedCashTotal", async () => {
      getTickets.mockResolvedValue([]);
      getOrdersWithPayments.mockResolvedValue([
        { paymentMethod: "Cash", total: 15.0, discountAmount: 5.0, refund: { refundedAt: toLocalNaive(shiftStartMilliseconds + 1000) } },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));

      expect(result.current.refundedCashTotal).toBe(10.0);
    });

    it("excludes refunds on non-cash orders from refundedCashTotal", async () => {
      getTickets.mockResolvedValue([]);
      getOrdersWithPayments.mockResolvedValue([
        { paymentMethod: "Card", total: 8.0, discountAmount: 0, refund: { refundedAt: toLocalNaive(shiftStartMilliseconds + 1000) } },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));

      expect(result.current.refundedCashTotal).toBe(0);
    });

    it("excludes refunds that happened before the shift started", async () => {
      getTickets.mockResolvedValue([]);
      getOrdersWithPayments.mockResolvedValue([
        { paymentMethod: "Cash", total: 15.0, discountAmount: 0, refund: { refundedAt: toLocalNaive(shiftStartMilliseconds - 5000) } },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));

      expect(result.current.refundedCashTotal).toBe(0);
    });

    it("counts a refund processed this shift even when the original order was sold in a previous shift", async () => {
      getTickets.mockResolvedValue([]);
      getOrdersWithPayments.mockResolvedValue([
        {
          paymentMethod: "Cash",
          total: 15.0,
          discountAmount: 0,
          createdAt: toLocalNaive(shiftStartMilliseconds - 86400000),
          refund: { refundedAt: toLocalNaive(shiftStartMilliseconds + 1000) },
        },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));

      expect(result.current.refundedCashTotal).toBe(15.0);
    });

    it("refundedCashTotal is 0 when no orders were refunded", async () => {
      getTickets.mockResolvedValue([]);
      getOrdersWithPayments.mockResolvedValue([
        { paymentMethod: "Cash", total: 15.0, discountAmount: 0, refund: null },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));
      await waitFor(() => expect(result.current.breakdownLoading).toBe(false));

      expect(result.current.refundedCashTotal).toBe(0);
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
      expect(result.current.cashTotal).toBe(0);
      expect(result.current.refundedCashTotal).toBe(0);
    });

    it("reset clears all metrics to initial state", async () => {
      getTickets.mockResolvedValue([ticketAfter1, ticketAfter2]);
      getPayments.mockResolvedValue([{ id: 10, methodId: 20 }]);
      getPaymentMethods.mockResolvedValue([{ id: 20, name: "Cash" }]);
      getPaymentByTicketId.mockResolvedValueOnce([{ paymentId: 10 }]);
      getOrdersWithPayments.mockResolvedValue([
        { paymentMethod: "Cash", total: 15.0, discountAmount: 0, refund: { refundedAt: toLocalNaive(shiftStartMilliseconds + 1000) } },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.refundedCashTotal).toBe(15.0));

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.totalBalance).toBe(0);
        expect(result.current.totalTips).toBe(0);
        expect(result.current.cashTotal).toBe(0);
        expect(result.current.refundedCashTotal).toBe(0);
        expect(result.current.totalTickets).toBe(0);
        expect(result.current.byPaymentMethod).toEqual([]);
      });
    });

    it("computes totalTips summing only tickets after shift start", async () => {
      getTickets.mockResolvedValue([
        { ...ticketAfter1, tipAmount: 2.5 },
        { ...ticketAfter2, tipAmount: 1.5 },
        { ...ticketBefore, tipAmount: 5.0 },
      ]);

      const { result } = renderHook(() => useShiftTicketMetrics(SHIFT_DATA));
      await waitFor(() => expect(result.current.ticketsLoading).toBe(false));

      expect(result.current.totalTips).toBe(4.0);
    });
  });
});
