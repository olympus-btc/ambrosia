"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";

import { I18nProvider } from "@/i18n/I18nProvider";
import { AuthProvider } from "@/providers/auth/AuthProvider";
import { ConfigurationsProvider } from "@/providers/configurations/configurationsProvider";
import { TurnProvider } from "@/providers/turn/TurnProvider";

export default function Providers({ children }) {
  return (
    <>
      <AuthProvider>
        <ConfigurationsProvider>
          <I18nProvider>
            <TurnProvider>
              <HeroUIProvider>
                <ToastProvider placement="top-right" maxVisibleToasts={1} />
                {children}
              </HeroUIProvider>
            </TurnProvider>
          </I18nProvider>
        </ConfigurationsProvider>
      </AuthProvider>
    </>
  );
}
