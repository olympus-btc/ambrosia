"use client";

import { useSyncExternalStore } from "react";

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

export function useSettingsAvailability() {
  const isLocalNetworkHostname = useIsLocalNetworkHostname();
  const secureConnectionAvailable = !isElectron && isLocalNetworkHostname;
  const isStandalone = useIsStandalone();
  const isIOS = useIsIOS();
  const isAndroid = useIsAndroid();
  const { isInstallable } = useInstallPrompt();
  const installPWAAvailable = !isElectron && !isStandalone && (isInstallable || isIOS || isAndroid);
  const devicesTabAvailable = secureConnectionAvailable || installPWAAvailable;

  return { secureConnectionAvailable, installPWAAvailable, devicesTabAvailable };
}
