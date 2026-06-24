"use client";

import { useMemo } from "react";

import { addToast } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";

import { useCurrency } from "@components/hooks/useCurrency";
import { CURRENCIES_EN } from "@components/pages/Onboarding/utils/currencies_en";
import { CURRENCIES_ES } from "@components/pages/Onboarding/utils/currencies_es";

import { CurrencyCard } from "./CurrencyCard";

export function Currency() {
  const locale = useLocale();
  const settingsTranslations = useTranslations("settings");
  const { currency, updateCurrency } = useCurrency();

  const currencies = useMemo(
    () => (locale === "en" ? CURRENCIES_EN : CURRENCIES_ES),
    [locale],
  );

  const handleCurrencyChange = async (newCurrencyAcronym) => {
    if (!newCurrencyAcronym || newCurrencyAcronym === currency.acronym) { return; }
    try {
      await updateCurrency({ acronym: newCurrencyAcronym });
      addToast({
        title: settingsTranslations("cardCurrency.successTitle") || "Success",
        description: settingsTranslations("cardCurrency.successDescription") || `Currency changed to ${newCurrencyAcronym}`,
        color: "success",
      });
    } catch (error) {
      console.error("Failed to update currency:", error);
      addToast({
        title: settingsTranslations("cardCurrency.errorTitle") || "Error",
        description: settingsTranslations("cardCurrency.errorDescription") || "Failed to update currency",
        color: "danger",
      });
    }
  };

  return (
    <CurrencyCard
      selectedCurrency={currency.acronym}
      currencies={currencies}
      onCurrencyChange={handleCurrencyChange}
    />
  );
}
