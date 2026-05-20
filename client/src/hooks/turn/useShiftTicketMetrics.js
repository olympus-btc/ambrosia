"use client";
import { useCallback, useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import {
  getTickets,
  getPayments,
  getPaymentMethods,
  getPaymentByTicketId,
} from "@/services/ticketsService";

export function useShiftTicketMetrics(openShiftData) {
  const shiftTranslations = useTranslations("shifts");

  const [totalBalance, setTotalBalance] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [byPaymentMethod, setByPaymentMethod] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const fetchTicketBreakdown = useCallback(async (shiftTickets) => {
    setBreakdownLoading(true);
    try {
      const [payments, methods] = await Promise.all([
        getPayments(),
        getPaymentMethods(),
      ]);

      const methodTotals = {};
      for (const ticket of shiftTickets) {
        const ticketPayments = await getPaymentByTicketId(ticket.id);
        if (!ticketPayments?.length) continue;

        const payment = payments.find((payment) => payment.id === ticketPayments[0].paymentId);
        if (!payment) continue;

        const method = methods.find((method) => method.id === payment.methodId);
        const methodName = method?.name ?? shiftTranslations("other");

        methodTotals[methodName] = (methodTotals[methodName] ?? 0) + ticket.totalAmount;
      }

      setByPaymentMethod(
        Object.entries(methodTotals).map(([name, total]) => ({ name, total })),
      );
    } finally {
      setBreakdownLoading(false);
    }
  }, [shiftTranslations]);

  const fetchShiftTickets = useCallback(async () => {
    if (!openShiftData?.shiftDate || !openShiftData?.startTime) return;

    setTicketsLoading(true);
    try {
      const shiftStartMs = new Date(
        `${openShiftData.shiftDate}T${openShiftData.startTime}`,
      ).getTime();

      const tickets = await getTickets();
      const shiftTickets = tickets.filter(
        (ticket) => new Date(`${ticket.ticketDate.replace(" ", "T")}Z`).getTime() >= shiftStartMs,
      );

      setTotalBalance(shiftTickets.reduce((runningTotal, ticket) => runningTotal + ticket.totalAmount, 0));
      setTotalTickets(shiftTickets.length);

      fetchTicketBreakdown(shiftTickets).catch(() => {});
    } catch {
    } finally {
      setTicketsLoading(false);
    }
  }, [openShiftData?.shiftDate, openShiftData?.startTime, fetchTicketBreakdown]);

  useEffect(() => {
    fetchShiftTickets();
  }, [fetchShiftTickets]);

  const reset = useCallback(() => {
    setTotalBalance(0);
    setTotalTickets(0);
    setByPaymentMethod([]);
    setTicketsLoading(false);
    setBreakdownLoading(false);
  }, []);

  return {
    totalBalance,
    totalTickets,
    byPaymentMethod,
    ticketsLoading,
    breakdownLoading,
    refresh: fetchShiftTickets,
    reset,
  };
}
