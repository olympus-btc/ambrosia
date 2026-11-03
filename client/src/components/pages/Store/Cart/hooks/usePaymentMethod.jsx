"use client";
import { useState, useEffect, useCallback } from "react";

import { usePermission } from "@/hooks/usePermission";
import { useFetchList } from "@/lib/http/useFetchList";

import { classifyPaymentMethod, PAYMENT_METHODS } from "../utils/paymentMethods";

function sortWithBtcFirst(paymentMethods) {
  const methodsWithBtcFlag = paymentMethods.map((method) => ({
    method,
    isBtc: classifyPaymentMethod(method?.name) === PAYMENT_METHODS.BTC,
  }));
  methodsWithBtcFlag.sort((firstEntry, secondEntry) => {
    if (firstEntry.isBtc !== secondEntry.isBtc) return firstEntry.isBtc ? -1 : 1;
    return (firstEntry.method?.name || "").localeCompare(secondEntry.method?.name || "", undefined, { sensitivity: "base" });
  });
  return methodsWithBtcFlag.map((entry) => entry.method);
}

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
      if (Array.isArray(paymentMethodsData)) {
        setPaymentMethods(sortWithBtcFirst(paymentMethodsData));
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
