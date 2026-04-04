"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { getSeed } from "@/services/walletService";

import { SeedCardLocked } from "./SeedCardLocked";
import { SeedCardUnlocked } from "./SeedCardUnlocked";

export function Seed() {
  const t = useTranslations("settings");
  const [showAccess, setShowAccess] = useState(false);
  const [seed, setSeed] = useState(null);

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
      t={t}
    />
  );
}
