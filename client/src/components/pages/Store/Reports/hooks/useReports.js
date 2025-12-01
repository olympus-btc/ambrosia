"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrders, getPaymentMethods, getPayments, getTickets, getPaymentByTicketId } from "@/modules/orders/ordersService";
import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

function parseLocalDate(dateStr, isStart = true) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    isStart ? 0 : 23,
    isStart ? 0 : 59,
    isStart ? 0 : 59,
    isStart ? 0 : 999,
  );
}

function formatTimeStamp(timestamp) {
  const date = new Date(Number(timestamp));
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function useReports() {
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const t = useTranslations("reports");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ticketsResponse, ordersResponse, paymentsResponse, paymentMethodsResponse] =
        await Promise.all([getTickets(), getOrders(), getPayments(), getPaymentMethods()]);

      setTickets(ticketsResponse || []);
      setOrders(ordersResponse || []);
      setPayments(paymentsResponse || []);
      setPaymentMethods(paymentMethodsResponse || []);
    } catch (err) {
      console.error(err);
      const resolved = t("statuses.errorLoad");
      setError(resolved);
      addToast({
        title: t("statuses.errorTitle"),
        description: resolved,
        variant: "solid",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateReportFromData = useCallback(
    async (startDate, endDate) => {
      const start = parseLocalDate(startDate, true);
      const end = parseLocalDate(endDate, false);

      const filteredTickets = tickets.filter((ticket) => {
        const ticketDate = new Date(Number(ticket.ticket_date));
        return ticketDate >= start && ticketDate <= end;
      });

      const reportsByDate = {};

      for (const ticket of filteredTickets) {
        const date = formatTimeStamp(ticket.ticket_date);

        const order = orders.find((o) => o.id === ticket.order_id);
        const userName = order?.waiter || "Desconocido";

        const ticketPayment = await getPaymentByTicketId(ticket.id);
        const payment = payments.find((p) => p.id === ticketPayment[0].payment_id);
        const paymentMethodName = paymentMethods.find(
          (method) => method.id === payment.method_id,
        )?.name;

        const ticketInfo = {
          amount: ticket.total_amount,
          paymentMethod: paymentMethodName,
          userName,
        };

        if (!reportsByDate[date]) {
          reportsByDate[date] = {
            date,
            balance: 0,
            tickets: [],
          };
        }

        reportsByDate[date].balance += ticket.total_amount;
        reportsByDate[date].tickets.push(ticketInfo);
      }

      const reports = Object.values(reportsByDate);
      const totalBalance = reports.reduce((sum, r) => sum + r.balance, 0);

      return {
        startDate,
        endDate,
        totalBalance,
        reports,
      };
    },
    [orders, paymentMethods, payments, tickets],
  );

  return useMemo(
    () => ({
      loading,
      error,
      loadData,
      generateReportFromData,
    }),
    [error, generateReportFromData, loadData, loading],
  );
}
