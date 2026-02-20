"use client";

import { useState, useEffect, useCallback } from "react";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import {
  isElectron,
  isWindows,
  onUpdateEvent,
  installUpdate,
  openReleasePage,
} from "@/utils/electron";

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;

    const cleanups = [];

    cleanups.push(
      onUpdateEvent("update:available", (data) => {
        setUpdateAvailable(data);
      }),
    );

    cleanups.push(
      onUpdateEvent("update:downloaded", (data) => {
        setUpdateAvailable(data);
        setDownloaded(true);
      }),
    );

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const t = useTranslations("updateBanner");

  const handleAction = useCallback(() => {
    if (downloaded && isWindows()) {
      installUpdate();
    } else if (isElectron()) {
      openReleasePage();
    } else {
      window.open("https://github.com/olympus-btc/ambrosia/releases", "_blank");
    }
  }, [downloaded]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="bg-primary-50 border-b border-primary-200 px-4 py-2 flex items-center justify-between gap-4 absolute top-0 w-full z-50">
      <span className="text-sm text-primary-700">
        {downloaded
          ? t("readyToInstall", { version: updateAvailable.version })
          : t("newVersionAvailable", { version: updateAvailable.version })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          className="bg-green-800 text-white"
          size="sm"
          color="primary"
          variant={downloaded ? "solid" : "flat"}
          onPress={handleAction}
        >
          {downloaded ? t("restartAndUpdate") : t("downloadFromGitHub")}
        </Button>
        <Button
          size="sm"
          variant="light"
          isIconOnly
          onPress={() => setDismissed(true)}
          aria-label={t("dismiss")}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
