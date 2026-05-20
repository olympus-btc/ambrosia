"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

export function usePayments() {
  const { fetchList } = useFetchList();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const paymentsData = await fetchList("/payments");
      if (paymentsData === null) return;
      setPayments(toArray(paymentsData));
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

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
