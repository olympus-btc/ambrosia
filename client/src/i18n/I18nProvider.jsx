"use client";

import { useEffect, useState, useMemo, createContext, useContext } from "react";
import { NextIntlClientProvider } from "next-intl";
import { Languages } from "lucide-react"
import { Button } from "@heroui/react";

import onboarding_es from "../components/pages/Onboarding/locales/es.js";
import onboarding_en from "../components/pages/Onboarding/locales/en.js";
import store_es from "../components/pages/Store/locales/es.js";
import store_en from "../components/pages/Store/locales/en.js";

const I18nContext = createContext(null);
export const useI18n = () => useContext(I18nContext);

const translations = {
  en: {
    onboarding: onboarding_en,
    store: store_en,
  },
  es: {
    onboarding: onboarding_es,
    store: store_es,
  },
}

function mergeLocales(locale) {
  const groups = translations[locale] || {};
  return Object.values(groups).reduce(
    (acc, mod) => ({ ...acc, ...mod }),
    {}
  );
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState("en");
  const messages = useMemo(() => mergeLocales(locale), [locale]);

  useEffect(() => {
    const stored = localStorage.getItem("locale");
    if (stored && translations[stored]) {
      setLocale(stored);
    }
  }, []);

  const changeLocale = (newLocale) => {
    if (!translations[newLocale]) return;
    setLocale(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return (
    <I18nContext.Provider value={{ locale, changeLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

export function LanguageSwitcher() {
  const { locale, changeLocale } = useI18n();
  return (
    <div className="absolute top-4 right-4 z-50">
      <Button
        className="bg-slate-200 rounded-lg"
        onPress={() => changeLocale(locale === "es" ? "en" : "es")}
        startContent={<Languages />}
      >
        {locale === "es" ? "Switch to English" : "Cambiar a Español"}
      </Button>
    </div>
  );
}
