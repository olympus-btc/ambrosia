"use client";
import { useEffect, useState } from "react";

import {
  getTickets,
  getPayments,
  getPaymentMethods,
  getPaymentByTicketId,
} from "@/modules/orders/ordersService";

export function useShiftTickets(shiftData) {
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [byPaymentMethod, setByPaymentMethod] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shiftData?.shift_date || !shiftData?.start_time) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const shiftStartMs = new Date(
          `${shiftData.shift_date}T${shiftData.start_time}`,
        ).getTime();

        const [tickets, payments, methods] = await Promise.all([
          getTickets(),
          getPayments(),
          getPaymentMethods(),
        ]);

        const shiftTickets = tickets.filter(
          (t) => Number(t.ticket_date) >= shiftStartMs,
        );

        const methodTotals = {};

        for (const ticket of shiftTickets) {
          const ticketPayments = await getPaymentByTicketId(ticket.id);
          if (!ticketPayments?.length) continue;

          const payment = payments.find(
            (p) => p.id === ticketPayments[0].payment_id,
          );
          if (!payment) continue;

          const method = methods.find((m) => m.id === payment.method_id);
          const methodName = method?.name ?? "Otro";

          methodTotals[methodName] = (methodTotals[methodName] ?? 0) + ticket.total_amount;
        }

        if (cancelled) return;

        const balance = shiftTickets.reduce((sum, t) => sum + t.total_amount, 0);
        setTotalBalance(balance);
        setTotalTickets(shiftTickets.length);
        setByPaymentMethod(
          Object.entries(methodTotals).map(([name, total]) => ({ name, total })),
        );
      } catch (err) {
        if (!cancelled) setError(err?.message || "Error al cargar datos del turno");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [shiftData?.shift_date, shiftData?.start_time]);

  return { totalBalance, totalTickets, byPaymentMethod, loading, error };
}
