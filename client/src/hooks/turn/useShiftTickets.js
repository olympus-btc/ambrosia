"use client";
import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import {
  getTickets,
  getPayments,
  getPaymentMethods,
  getPaymentByTicketId,
} from "@/modules/orders/ordersService";

export function useShiftTickets(shiftData) {
  const ts = useTranslations("shifts");
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [byPaymentMethod, setByPaymentMethod] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shiftData?.shift_date || !shiftData?.start_time) return;

    let cancelled = false;

    async function fetchBreakdown(shiftTickets) {
      const [payments, methods] = await Promise.all([
        getPayments(),
        getPaymentMethods(),
      ]);

      const methodTotals = {};
      for (const ticket of shiftTickets) {
        const ticketPayments = await getPaymentByTicketId(ticket.id);
        if (!ticketPayments?.length) continue;

        const payment = payments.find((payment) => payment.id === ticketPayments[0].payment_id);
        if (!payment) continue;

        const method = methods.find((method) => method.id === payment.method_id);
        const methodName = method?.name ?? ts("other");

        methodTotals[methodName] = (methodTotals[methodName] ?? 0) + ticket.total_amount;
      }

      if (!cancelled) {
        setByPaymentMethod(
          Object.entries(methodTotals).map(([name, total]) => ({ name, total })),
        );
      }
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const shiftStartMs = new Date(
          `${shiftData.shift_date}T${shiftData.start_time}`,
        ).getTime();

        const tickets = await getTickets();
        const shiftTickets = tickets.filter(
          (t) => Number(t.ticket_date) >= shiftStartMs,
        );

        if (cancelled) return;

        setTotalBalance(shiftTickets.reduce((sum, t) => sum + t.total_amount, 0));
        setTotalTickets(shiftTickets.length);

        fetchBreakdown(shiftTickets).catch(() => {});
      } catch (err) {
        if (!cancelled) setError(err?.message || ts("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [shiftData?.shift_date, shiftData?.start_time, ts]);

  return { totalBalance, totalTickets, byPaymentMethod, loading, error };
}
