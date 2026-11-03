"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { httpClient, parseJsonResponse } from "@/lib/http";

const DEFAULT_CURRENCY = {
  id: null,
  acronym: "USD",
  symbol: "$",
  locale: "en-US",
  name: null,
  countryCode: null,
  countryName: null,
};

function deriveLocale(countryCode) {
  if (!countryCode) return null;
  return `${countryCode.toLowerCase()}-${countryCode.toUpperCase()}`;
}

function parseCurrencyData(base) {
  const currencyId = base?.currencyId || base?.id;
  const baseAcronym = base?.acronym;

  return {
    id: currencyId || null,
    acronym: baseAcronym || DEFAULT_CURRENCY.acronym,
    symbol: base?.symbol || DEFAULT_CURRENCY.symbol,
    name: base?.name || DEFAULT_CURRENCY.name,
    countryCode: base?.countryCode || null,
    countryName: base?.countryName || null,
    locale:
      deriveLocale(base?.countryCode) ||
      base?.locale ||
      (typeof navigator !== "undefined" ? navigator.language : DEFAULT_CURRENCY.locale),
  };
}

export function useCurrency() {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  const fetchCurrency = useCallback(async ({ isCancelled } = {}) => {
    try {
      const baseCurrencyResponse = await httpClient("/base-currency", { skipForbiddenRedirect: true });
      const base = await parseJsonResponse(baseCurrencyResponse, null);
      if (!isCancelled?.()) setCurrency(parseCurrencyData(base));
    } catch {
      if (!isCancelled?.()) setCurrency(DEFAULT_CURRENCY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await fetchCurrency({ isCancelled: () => cancelled });
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchCurrency]);

  const formatAmount = useCallback(
    (cents) => {
      const numeric = Number(cents);
      if (!Number.isFinite(numeric)) return cents;
      const value = numeric / 100;
      try {
        if (currency.symbol) {
          const formattedNumber = new Intl.NumberFormat(currency.locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(value);
          return `${currency.symbol} ${formattedNumber}`;
        }

        return new Intl.NumberFormat(currency.locale, {
          style: "currency",
          currency: currency.acronym || DEFAULT_CURRENCY.acronym,
        }).format(value);
      } catch {
        const prefix = currency.symbol || currency.acronym || DEFAULT_CURRENCY.acronym;
        return `${prefix} ${value.toFixed(2)}`;
      }
    },
    [currency],
  );

  const updateCurrency = useCallback(
    async (acronymOrObj) => {
      const acronym =
        typeof acronymOrObj === "string"
          ? acronymOrObj
          : acronymOrObj?.acronym || DEFAULT_CURRENCY.acronym;

      const updateCurrencyResponse = await httpClient(`/base-currency`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ acronym }),
        skipForbiddenRedirect: true,
      });

      fetchCurrency();
      return await parseJsonResponse(updateCurrencyResponse, null);
    },
    [fetchCurrency],
  );

  return useMemo(
    () => ({
      currency,
      updateCurrency,
      formatAmount,
      refetch: fetchCurrency,
    }),
    [currency, formatAmount, fetchCurrency, updateCurrency],
  );
}
