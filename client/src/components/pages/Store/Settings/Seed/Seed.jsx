"use client";

import { useEffect, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useTour } from "@/hooks/tour/useTour";
import { getInfo, getSeed } from "@/services/walletService";

import { SeedCardLocked } from "./SeedCardLocked";
import { SeedCardUnlocked } from "./SeedCardUnlocked";

const SEED_SETTINGS_TOUR_KEY = "ambrosia:tour:seed-settings";
export const SEED_SEEN_KEY = "ambrosia:tour:seed-seen";

export function Seed() {
  const t = useTranslations("settings");
  const tTour = useTranslations("seedTour");
  const [showAccess, setShowAccess] = useState(false);
  const [seed, setSeed] = useState(null);
  const [seedSupported, setSeedSupported] = useState(true);

  useEffect(() => {
    getInfo()
      .then((info) => {
        if (info?.version === "NWC") setSeedSupported(false);
      })
      .catch(() => {});
  }, []);

  useTour({
    key: SEED_SETTINGS_TOUR_KEY,
    condition: !showAccess,
    delay: 500,
    onBeforeStart: () => {
      const el = document.getElementById("settings-seed-card");
      if (el) {
        el.style.scrollMarginTop = "80px";
        el.scrollIntoView({ behavior: "instant", block: "start" });
        el.style.scrollMarginTop = "";
      }
    },
    driverOptions: {
      allowClose: false,
      overlayOpacity: 0.5,
      steps: [
        {
          element: "#settings-seed-card",
          popover: {
            title: tTour("settingsTitle"),
            description: tTour.raw("settingsDescription"),
            side: "bottom",
            align: "start",
            nextBtnText: tTour("settingsButton"),
            showButtons: ["next"],
          },
        },
      ],
      onDestroyStarted: () => {
        localStorage.setItem(SEED_SEEN_KEY, "true");
        window.dispatchEvent(new Event("seed-tour:seen"));
      },
    },
  });

  const handleAuthorized = async () => {
    try {
      const seedText = await getSeed();
      setSeed(seedText);
    } catch {
      addToast({
        title: t("cardSeed.errorTitle"),
        description: t("cardSeed.errorDescription"),
        color: "danger",
      });
      setShowAccess(false);
    }
  };

  const handleHide = () => {
    setSeed(null);
    setShowAccess(false);
  };

  if (showAccess) {
    return (
      <SeedCardUnlocked
        seed={seed}
        onAuthorized={handleAuthorized}
        onHide={handleHide}
        t={t}
      />
    );
  }

  return (
    <SeedCardLocked
      onReveal={() => setShowAccess(true)}
      disabled={!seedSupported}
      t={t}
    />
  );
}
