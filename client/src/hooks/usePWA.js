"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export function useIsStandalone() {
  return useSyncExternalStore(
    (callback) => {
      const mediaQuery = window.matchMedia("(display-mode: standalone)");
      mediaQuery.addEventListener("change", callback);
      return () => mediaQuery.removeEventListener("change", callback);
    },
    () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true,
    () => false,
  );
}

export function useIsIOS() {
  return useSyncExternalStore(
    () => () => {},
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    () => false,
  );
}

export function useIsAndroid() {
  return useSyncExternalStore(
    () => () => {},
    () => /android/i.test(window.navigator.userAgent),
    () => false,
  );
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPromptEvent(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setPromptEvent(null);
      setIsInstallable(false);
    }
  };

  return { isInstallable, promptInstall };
}
