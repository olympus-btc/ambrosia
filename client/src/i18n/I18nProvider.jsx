"use client";

import { useState, useMemo, createContext, useContext } from "react";

import { Button } from "@heroui/react";
import { Languages } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";

import componentsEn from "../components/locales/en";
import componentsEs from "../components/locales/es";
import onboardingEn from "../components/pages/Onboarding/locales/en";
import onboardingEs from "../components/pages/Onboarding/locales/es";
import storeEn from "../components/pages/Store/locales/en";
import storeEs from "../components/pages/Store/locales/es";
import unauthorizedEn from "../components/pages/Unauthorized/locales/en";
import unauthorizedEs from "../components/pages/Unauthorized/locales/es";

const I18nContext = createContext(null);
export const useI18n = () => useContext(I18nContext);

const translations = {
  en: {
    components: componentsEn,
    onboarding: onboardingEn,
    store: storeEn,
    unauthorized: unauthorizedEn,
  },
  es: {
    components: componentsEs,
    onboarding: onboardingEs,
    store: storeEs,
    unauthorized: unauthorizedEs,
  },
};

function mergeLocales(locale) {
  const groups = translations[locale] || {};
  return Object.values(groups).reduce(
    (acc, mod) => ({ ...acc, ...mod }),
    {},
  );
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("locale");
    return (stored && translations[stored]) ? stored : "en";
  });
  const messages = useMemo(() => mergeLocales(locale), [locale]);

  const changeLocale = (newLocale) => {
    if (!translations[newLocale]) return;
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return (
    <I18nContext.Provider value={{ locale, changeLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

export function LanguageSwitcher() {
  const { locale, changeLocale } = useI18n();
  return (
    <Button
      className="bg-slate-200 rounded-lg"
      onPress={() => changeLocale(locale === "es" ? "en" : "es")}
      startContent={<Languages />}
    >
      {locale === "es" ? "Switch to English" : "Cambiar a Español"}
    </Button>
  );
}
