"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient, parseJsonResponse } from "@/lib/http";

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const paymentMethodsResponse = await httpClient("/payments/methods");

      const paymentMethodsData = await parseJsonResponse(paymentMethodsResponse, []);

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
  }, []);

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
