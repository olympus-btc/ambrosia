"use client";
import { useState, useEffect, useCallback } from "react";

import { usePermission } from "@/hooks/usePermission";
import { useFetchList } from "@/lib/http/useFetchList";

export function usePaymentMethods() {
  const { fetchList } = useFetchList();
  const canRead = usePermission({ allOf: ["payments_read"] });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(canRead);
  const [error, setError] = useState(null);

  const fetchPaymentMethods = useCallback(async () => {
    if (!canRead) return;
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
    } catch (paymentMethodsLoadError) {
      console.error("Error fetching payment methods:", paymentMethodsLoadError);
      setError(paymentMethodsLoadError);
    } finally {
      setLoading(false);
    }
  }, [canRead, fetchList]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return {
    paymentMethods,
    loading,
    error,
    forbidden: !canRead,
    refetch: fetchPaymentMethods,
  };
}
