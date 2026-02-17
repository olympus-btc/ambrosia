"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

export function usePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketPayments, setTicketPayments] = useState([]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payments = await httpClient("/payments");
      const paymentsData = await parseJsonResponse(payments, []);

      if (Array.isArray(paymentsData)) {
        setPayments(paymentsData);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPayment = useCallback(
    async (paymentBody) => {
      try {
        const createPayment = await httpClient("/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentBody),
        });

        const createdDataPayment = await parseJsonResponse(createPayment, null);

        if (createdDataPayment?.id) {
          setPayments((prev) => (Array.isArray(prev) ? [...prev, createdDataPayment] : [createdDataPayment]),
          );
        }
        return createdDataPayment;
      } catch (error) {
        console.error("Error creating payment:", error);
        setError(error);
        throw error;
      }
    },
    [],
  );

  const getPaymentCurrencyById = useCallback(
    async (currencyId) => {
      if (!currencyId) return null;
      try {
        const paymentCurrencyById = await httpClient(`/payments/currencies/${currencyId}`);
        return await parseJsonResponse(paymentCurrencyById, null);
      } catch (error) {
        console.error("Error fetching payment currency:", error);
        setError(error);
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const linkPaymentToTicket = useCallback(
    async (paymentId, ticketId) => {
      try {
        const linkPayment = await httpClient("/payments/ticket-payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payment_id: paymentId,
            ticket_id: ticketId,
          }),
        });

        const linkedPayment = await parseJsonResponse(linkPayment, null);

        if (linkedPayment?.payment_id && linkPayment?.ticket_id) {
          setTicketPayments((prev) => (Array.isArray(prev)
            ? [...prev, { payment_id: paymentId, ticket_id: ticketId }]
            : [{ payment_id: paymentId, ticket_id: ticketId }]),
          );
        }
        return linkPayment;
      } catch (error) {
        console.error("Error linking payment to ticket:", error);
        setError(error);
        throw error;
      }
    },
    [],
  );

  return {
    payments,
    ticketPayments,
    loading,
    error,
    refetch: fetchPayments,
    createPayment,
    linkPaymentToTicket,
    getPaymentCurrencyById,
  };
}
