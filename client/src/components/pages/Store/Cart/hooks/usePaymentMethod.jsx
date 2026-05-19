"use client";
import { useState, useEffect, useCallback } from "react";

import { useFetchList } from "@/lib/http/useFetchList";

export function usePaymentMethods() {
  const { fetchList } = useFetchList();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const paymentMethodsData = await fetchList("/payments/methods");
      if (paymentMethodsData === null) return;
      if (Array.isArray(paymentMethodsData)) {
        const sorted = [...paymentMethodsData].sort((a, b) => {
          const nameA = a?.name || "";
          const nameB = b?.name || "";
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        });
        setPaymentMethods(sorted);
      } else {
        setPaymentMethods([]);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return {
    paymentMethods,
    loading,
    error,
    refetch: fetchPaymentMethods,
  };
}
