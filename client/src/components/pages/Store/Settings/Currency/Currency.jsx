"use client";

import { useMemo } from "react";

import { useLocale } from "next-intl";

import { useCurrency } from "@components/hooks/useCurrency";
import { CURRENCIES_EN } from "@components/pages/Onboarding/utils/currencies_en";
import { CURRENCIES_ES } from "@components/pages/Onboarding/utils/currencies_es";

import { CurrencyCard } from "./CurrencyCard";

export function Currency() {
  const locale = useLocale();
  const { currency, updateCurrency } = useCurrency();

  const currencies = useMemo(
    () => (locale === "en" ? CURRENCIES_EN : CURRENCIES_ES),
    [locale],
  );

  const handleCurrencyChange = (e) => {
    if (!e.target.value) { return; }
    updateCurrency({ acronym: e.target.value });
  };

  return (
    <CurrencyCard
      selectedCurrency={currency.acronym}
      currencies={currencies}
      onCurrencyChange={handleCurrencyChange}
    />
  );
}
