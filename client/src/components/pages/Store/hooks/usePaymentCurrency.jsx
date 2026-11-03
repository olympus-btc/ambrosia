"use client";
import { useCallback, useState } from "react";

import { usePermission } from "@/hooks/usePermission";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function usePaymentCurrency() {
  const canRead = usePermission({ allOf: ["payments_read"] });
  const [error, setError] = useState(null);

  const getPaymentCurrencyById = useCallback(
    async (currencyId) => {
      if (!canRead || !currencyId) return null;
      try {
        const paymentCurrencyResponse = await httpClient(`/payments/currencies/${currencyId}`, { skipForbiddenRedirect: true });
        return await parseJsonResponse(paymentCurrencyResponse, null);
      } catch (paymentCurrencyError) {
        console.error("Error fetching payment currency:", paymentCurrencyError);
        setError(paymentCurrencyError);
        throw paymentCurrencyError;
      }
    },
    [canRead],
  );

  return {
    getPaymentCurrencyById,
    error,
    forbidden: !canRead,
  };
}
