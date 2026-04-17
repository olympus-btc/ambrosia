"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function usePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payments = await httpClient("/payments");
      const paymentsData = await parseJsonResponse(payments, []);
      setPayments(toArray(paymentsData));
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
    getPaymentCurrencyById,
  };
}
