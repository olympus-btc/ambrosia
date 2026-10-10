"use client";

import { useSyncExternalStore } from "react";

import { useTranslations } from "next-intl";

import { useInstallPrompt, useIsAndroid, useIsIOS, useIsStandalone } from "@hooks/usePWA";
import { isElectron } from "@lib/isElectron";

function subscribeToNothing() {
  return () => {};
}

function getIsLocalNetworkHostname() {
  return window.location.hostname.endsWith(".local");
}

function getServerIsLocalNetworkHostname() {
  return false;
}

function useIsLocalNetworkHostname() {
  return useSyncExternalStore(subscribeToNothing, getIsLocalNetworkHostname, getServerIsLocalNetworkHostname);
}

export function useSettingsAvailability({ isAdmin }) {
  const settingsTranslations = useTranslations("settings");

  const isLocalNetworkHostname = useIsLocalNetworkHostname();
  const secureConnectionAvailable = !isElectron && isLocalNetworkHostname;
  const isStandalone = useIsStandalone();
  const isIOS = useIsIOS();
  const isAndroid = useIsAndroid();
  const { isInstallable } = useInstallPrompt();
  const installPWAAvailable = !isElectron && !isStandalone && (isInstallable || isIOS || isAndroid);
  const devicesTabAvailable = secureConnectionAvailable || installPWAAvailable;

  const availableTabs = [
    { key: "business", label: settingsTranslations("categories.business") },
    { key: "preferences", label: settingsTranslations("categories.preferences") },
    isAdmin && { key: "wallet", label: settingsTranslations("categories.wallet") },
    isAdmin && { key: "backup", label: settingsTranslations("categories.backup") },
    devicesTabAvailable && { key: "devices", label: settingsTranslations("categories.devices") },
    { key: "printing", label: settingsTranslations("categories.printing") },
    isAdmin && { key: "system", label: settingsTranslations("categories.system") },
    isAdmin && { key: "help", label: settingsTranslations("categories.help") },
  ].filter(Boolean);

  return { availableTabs, secureConnectionAvailable, installPWAAvailable, devicesTabAvailable };
}
