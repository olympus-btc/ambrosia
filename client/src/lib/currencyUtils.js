import { useState, useEffect } from "react";

import { getBaseCurrency, getPaymentCurrencies } from "../modules/orders/ordersService";

// Cache para evitar múltiples llamadas a la API
let currencyCache = {
  baseCurrency: null,
  currencies: null,
  lastFetch: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getSystemCurrency() {
  const now = Date.now();

  // Si tenemos cache válido, lo usamos
  if (currencyCache.baseCurrency &&
      currencyCache.currencies &&
      currencyCache.lastFetch &&
      (now - currencyCache.lastFetch) < CACHE_DURATION) {
    return {
      baseCurrencyId: currencyCache.baseCurrency.currency_id,
      currencies: currencyCache.currencies,
      baseCurrency: currencyCache.currencies.find((c) => c.id === currencyCache.baseCurrency.currency_id),
    };
  }

  try {
    // Obtener moneda base y todas las monedas en paralelo
    const [baseCurrencyResponse, currenciesResponse] = await Promise.all([
      getBaseCurrency(),
      getPaymentCurrencies(),
    ]);

    // Actualizar cache
    currencyCache = {
      baseCurrency: baseCurrencyResponse,
      currencies: currenciesResponse,
      lastFetch: now,
    };

    const baseCurrency = currenciesResponse.find((c) => c.id === baseCurrencyResponse.currency_id);

    return {
      baseCurrencyId: baseCurrencyResponse.currency_id,
      currencies: currenciesResponse,
      baseCurrency,
    };
  } catch (error) {
    console.error("Error obteniendo información de moneda:", error);
    // Fallback a MXN si hay error
    return {
      baseCurrencyId: null,
      currencies: [],
      baseCurrency: { acronym: "MXN" },
    };
  }
}

export async function formatCurrency(amount, currencyAcronym = null) {
  try {
    let currency = currencyAcronym;

    if (!currency) {
      const systemCurrency = await getSystemCurrency();
      currency = systemCurrency.baseCurrency?.acronym || "MXN";
    }

    // Mapear algunos acrónimos a códigos ISO estándar
    const currencyMap = {
      EUR: "EUR",
      USD: "USD",
      MXN: "MXN",
      BTC: "BTC", // Para Bitcoin usaremos formato especial
    };

    const mappedCurrency = currencyMap[currency] || currency;

    // Para Bitcoin y otras criptomonedas
    if (currency === "BTC") {
      return `₿ ${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8,
      }).format(amount)}`;
    }

    // Para monedas fiduciarias
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: mappedCurrency,
    }).format(amount);
  } catch (error) {
    console.error("Error formateando moneda:", error);
    // Fallback básico
    return `${currencyAcronym || "MXN"} ${amount.toFixed(2)}`;
  }
}

// Hook personalizado para React
export function useCurrency() {
  const [systemCurrency, setSystemCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCurrency() {
      try {
        setLoading(true);
        const currency = await getSystemCurrency();
        setSystemCurrency(currency);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error("Error en useCurrency:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCurrency();
  }, []);

  const formatAmount = async (amount, currencyAcronym = null) => await formatCurrency(amount, currencyAcronym || systemCurrency?.baseCurrency?.acronym);

  return {
    systemCurrency,
    loading,
    error,
    formatAmount,
  };
}
