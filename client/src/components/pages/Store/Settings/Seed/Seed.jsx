"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useTour } from "@/hooks/tour/useTour";
import { getSeed } from "@/services/walletService";

import { SeedCardLocked } from "./SeedCardLocked";
import { SeedCardUnlocked } from "./SeedCardUnlocked";

const SEED_SETTINGS_TOUR_KEY = "ambrosia:tour:seed-settings";
export const SEED_SEEN_KEY = "ambrosia:tour:seed-seen";

export function Seed() {
  const seedTranslations = useTranslations("settings");
  const seedTourTranslations = useTranslations("seedTour");
  const [showAccess, setShowAccess] = useState(false);
  const [seed, setSeed] = useState(null);

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
            title: seedTourTranslations("settingsTitle"),
            description: seedTourTranslations.raw("settingsDescription"),
            side: "bottom",
            align: "start",
            nextBtnText: seedTourTranslations("settingsButton"),
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
    } catch (error) {
      addToast({
        title: seedTranslations("cardSeed.errorTitle"),
        description: error?.code === "unsupported_operation"
          ? seedTranslations("cardSeed.notAvailableNwc")
          : seedTranslations("cardSeed.errorDescription"),
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
        seedCardTranslations={seedTranslations}
      />
    );
  }

  return (
    <SeedCardLocked
      onReveal={() => setShowAccess(true)}
      seedCardTranslations={seedTranslations}
    />
  );
}
