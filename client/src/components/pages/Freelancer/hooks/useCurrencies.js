"use client";

import { useCallback, useEffect, useState } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useCurrencies({ skipForbiddenRedirect = false } = {}) {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const currenciesResponse = await httpClient("/currencies", { skipForbiddenRedirect });
      setForbidden(currenciesResponse.status === 403);
      if (!currenciesResponse.ok) return;

      const currenciesData = await parseJsonResponse(currenciesResponse, []);
      setCurrencies(toArray(currenciesData).filter((currency) => currency.id));
    } catch (loadCurrenciesError) {
      setLoadError(loadCurrenciesError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  return {
    currencies,
    loading,
    error: loadError,
    forbidden,
    refetch: fetchCurrencies,
  };
}
