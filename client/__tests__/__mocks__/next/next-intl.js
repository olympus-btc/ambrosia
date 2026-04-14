import React from "react";

const t = (key) => key;
t.raw = (key) => key;
export const useTranslations = () => t;
export const useLocale = () => "es";
export const useFormatter = () => ({
  dateTime: (date) => (date instanceof Date ? date.toISOString() : String(date)),
});
export const NextIntlClientProvider = ({ children }) => <>{children}</>;
