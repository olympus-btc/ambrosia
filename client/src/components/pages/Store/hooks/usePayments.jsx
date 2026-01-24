"use client";
import { useState, useEffect, useCallback } from "react";

import { apiClient } from "@/services/apiClient";

export function usePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketPayments, setTicketPayments] = useState([]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient("/payments");
      if (Array.isArray(res)) {
        setPayments(res);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPayment = useCallback(
    async (paymentBody) => {
      try {
        const created = await apiClient("/payments", {
          method: "POST",
          body: paymentBody,
        });
        if (created?.id) {
          setPayments((prev) => (Array.isArray(prev) ? [...prev, created] : [created]),
          );
        }
        return created;
      } catch (err) {
        console.error("Error creating payment:", err);
        setError(err);
        throw err;
      }
    },
    [],
  );

  const getPaymentCurrencyById = useCallback(
    async (currencyId) => {
      if (!currencyId) return null;
      try {
        return await apiClient(`/payments/currencies/${currencyId}`);
      } catch (err) {
        console.error("Error fetching payment currency:", err);
        setError(err);
        throw err;
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
        const linked = await apiClient("/payments/ticket-payments", {
          method: "POST",
          body: {
            payment_id: paymentId,
            ticket_id: ticketId,
          },
        });
        if (linked?.payment_id && linked?.ticket_id) {
          setTicketPayments((prev) => (Array.isArray(prev)
            ? [...prev, { payment_id: paymentId, ticket_id: ticketId }]
            : [{ payment_id: paymentId, ticket_id: ticketId }]),
          );
        }
        return linked;
      } catch (err) {
        console.error("Error linking payment to ticket:", err);
        setError(err);
        throw err;
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
