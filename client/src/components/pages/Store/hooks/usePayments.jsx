"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
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
    } catch (paymentsLoadError) {
      console.error("Error fetching payments:", paymentsLoadError);
      setError(paymentsLoadError);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
  };
}
