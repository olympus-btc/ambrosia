"use client";

import { useSyncExternalStore } from "react";

import { HeroUIProvider, ToastProvider } from "@heroui/react";

import ClientErrorReporter from "@/components/ClientErrorReporter";
import { I18nProvider } from "@/i18n/I18nProvider";
import { AuthProvider } from "@/providers/auth/AuthProvider";
import { ConfigurationsProvider } from "@/providers/configurations/configurationsProvider";
import {
  DisplayContextProvider,
  getInitialDisableAnimation,
  persistDisableAnimation,
} from "@/providers/display/DisplayProvider";
import { TurnProvider } from "@/providers/turn/TurnProvider";

export default function Providers({ children }) {
  const disableAnimation = useSyncExternalStore(
    () => () => {},
    getInitialDisableAnimation,
    () => false,
  );

  const handleSetDisableAnimation = (shouldDisableAnimation) => {
    persistDisableAnimation(shouldDisableAnimation);
    window.location.reload();
  };

  return (
    <>
      <AuthProvider>
        <ClientErrorReporter />
        <ConfigurationsProvider>
          <I18nProvider>
            <TurnProvider>
              <DisplayContextProvider value={{ disableAnimation, setDisableAnimation: handleSetDisableAnimation }}>
                <HeroUIProvider disableAnimation={disableAnimation}>
                  <ToastProvider placement="top-right" maxVisibleToasts={1} />
                  {children}
                </HeroUIProvider>
              </DisplayContextProvider>
            </TurnProvider>
          </I18nProvider>
        </ConfigurationsProvider>
      </AuthProvider>
    </>
  );
}
