"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";

import { I18nProvider } from "@/i18n/I18nProvider";
import { TurnProvider } from "@/modules/cashier/useTurn";
import { AuthProvider } from "@/providers/auth/AuthProvider";
import { ConfigurationsProvider } from "@/providers/configurations/configurationsProvider";

export default function Providers({ children }) {
  return (
    <>
      <AuthProvider>
        <ConfigurationsProvider>
          <TurnProvider>
            <I18nProvider>
              <HeroUIProvider>
                <ToastProvider placement="top-right" maxVisibleToasts={1} />
                {children}
              </HeroUIProvider>
            </I18nProvider>
          </TurnProvider>
        </ConfigurationsProvider>
      </AuthProvider>
    </>
  );
}
