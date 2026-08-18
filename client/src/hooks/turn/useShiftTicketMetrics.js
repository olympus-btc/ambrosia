"use client";
import { useCallback, useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { classifyPaymentMethod, PAYMENT_METHODS } from "@/components/pages/Store/Cart/utils/paymentMethods";
import {
  getTickets,
  getPayments,
  getPaymentMethods,
  getPaymentByTicketId,
  getOrdersWithPayments,
} from "@/services/ticketsService";

export function useShiftTicketMetrics(openShiftData) {
  const shiftTranslations = useTranslations("shifts");

  const [totalBalance, setTotalBalance] = useState(0);
  const [cashTotal, setCashTotal] = useState(0);
  const [refundedCashTotal, setRefundedCashTotal] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [byPaymentMethod, setByPaymentMethod] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const fetchTicketBreakdown = useCallback(async (shiftTickets, shiftStartMilliseconds) => {
    setBreakdownLoading(true);
    try {
      const [payments, methods, orders] = await Promise.all([
        getPayments(),
        getPaymentMethods(),
        getOrdersWithPayments(),
      ]);

      const methodTotals = {};
      let cashRunningTotal = 0;
      for (const ticket of shiftTickets) {
        const ticketPayments = await getPaymentByTicketId(ticket.id);
        if (!ticketPayments?.length) continue;

        const payment = payments.find((payment) => payment.id === ticketPayments[0].paymentId);
        if (!payment) continue;

        const method = methods.find((method) => method.id === payment.methodId);
        const methodName = method?.name ?? shiftTranslations("other");

        methodTotals[methodName] = (methodTotals[methodName] ?? 0) + ticket.totalAmount;

        if (classifyPaymentMethod(method?.name) === PAYMENT_METHODS.CASH) {
          cashRunningTotal += ticket.totalAmount;
        }
      }

      const refundedCashRunningTotal = orders
        .filter((order) => order.refund?.refundedAt)
        .filter((order) => new Date(order.refund.refundedAt.replace(" ", "T")).getTime() >= shiftStartMilliseconds)
        .filter((order) => classifyPaymentMethod(order.paymentMethod) === PAYMENT_METHODS.CASH)
        .reduce((runningTotal, order) => runningTotal + (order.total - order.discountAmount), 0);

      setByPaymentMethod(
        Object.entries(methodTotals).map(([name, total]) => ({ name, total })),
      );
      setCashTotal(cashRunningTotal);
      setRefundedCashTotal(refundedCashRunningTotal);
    } finally {
      setBreakdownLoading(false);
    }
  }, [shiftTranslations]);

  const fetchShiftTickets = useCallback(async () => {
    if (!openShiftData?.shiftDate || !openShiftData?.startTime) return;

    setTicketsLoading(true);
    try {
      const shiftStartMilliseconds = new Date(
        `${openShiftData.shiftDate}T${openShiftData.startTime}`,
      ).getTime();

      const tickets = await getTickets();
      const shiftTickets = tickets.filter(
        (ticket) => new Date(ticket.ticketDate.replace(" ", "T")).getTime() >= shiftStartMilliseconds,
      );

      setTotalBalance(shiftTickets.reduce((runningTotal, ticket) => runningTotal + ticket.totalAmount, 0));
      setTotalTickets(shiftTickets.length);

      fetchTicketBreakdown(shiftTickets, shiftStartMilliseconds).catch(() => {});
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
    setCashTotal(0);
    setRefundedCashTotal(0);
    setTotalTickets(0);
    setByPaymentMethod([]);
    setTicketsLoading(false);
    setBreakdownLoading(false);
  }, []);

  return {
    totalBalance,
    cashTotal,
    refundedCashTotal,
    totalTickets,
    byPaymentMethod,
    ticketsLoading,
    breakdownLoading,
    refresh: fetchShiftTickets,
    reset,
  };
}
