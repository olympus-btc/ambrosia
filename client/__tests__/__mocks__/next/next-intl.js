import React from "react";

const t = (key) => key;
t.raw = (key) => key;
export const useTranslations = () => t;
export const useLocale = () => "es";
export const NextIntlClientProvider = ({ children }) => <>{children}</>;
