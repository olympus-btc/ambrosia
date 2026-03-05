import { renderHook, waitFor } from "@testing-library/react";

jest.mock("@/modules/orders/ordersService", () => ({
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
} from "@/modules/orders/ordersService";

import { useShiftTickets } from "../useShiftTickets";

const SHIFT_DATE = "2026-03-04";
const START_TIME = "08:00:00";
const SHIFT_START_MS = new Date(`${SHIFT_DATE}T${START_TIME}`).getTime();

const ticketAfter1 = { id: 1, ticket_date: String(SHIFT_START_MS + 1000), total_amount: 5.0 };
const ticketAfter2 = { id: 2, ticket_date: String(SHIFT_START_MS + 2000), total_amount: 3.0 };
const ticketBefore = { id: 3, ticket_date: String(SHIFT_START_MS - 5000), total_amount: 10.0 };

const SHIFT_DATA = { shift_date: SHIFT_DATE, start_time: START_TIME };

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

    it("computes byPaymentMethod breakdown from ticket payments", async () => {
      getTickets.mockResolvedValue([ticketAfter1, ticketAfter2]);
      getPayments.mockResolvedValue([
        { id: 10, method_id: 20 },
        { id: 11, method_id: 21 },
      ]);
      getPaymentMethods.mockResolvedValue([
        { id: 20, name: "Cash" },
        { id: 21, name: "Card" },
      ]);
      getPaymentByTicketId
        .mockResolvedValueOnce([{ payment_id: 10 }])
        .mockResolvedValueOnce([{ payment_id: 11 }]);

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
      getPayments.mockResolvedValue([{ id: 10, method_id: 99 }]);
      getPaymentMethods.mockResolvedValue([]);
      getPaymentByTicketId.mockResolvedValueOnce([{ payment_id: 10 }]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.byPaymentMethod).toHaveLength(1));

      expect(result.current.byPaymentMethod[0].name).toBe("other");
    });

    it("skips ticket with no payment records in breakdown", async () => {
      getTickets.mockResolvedValue([ticketAfter1]);
      getPayments.mockResolvedValue([{ id: 10, method_id: 20 }]);
      getPaymentMethods.mockResolvedValue([{ id: 20, name: "Cash" }]);
      getPaymentByTicketId.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useShiftTickets(SHIFT_DATA));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.byPaymentMethod).toEqual([]);
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
