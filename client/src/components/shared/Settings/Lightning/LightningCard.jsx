"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useAutoLiquidity } from "@/hooks/useAutoLiquidity";

import { LightningCardLocked } from "./LightningCardLocked";
import { LightningCardUnlocked } from "./LightningCardUnlocked";

export function LightningCard() {
  const lightningCardTranslations = useTranslations("lightning");
  const [showAccess, setShowAccess] = useState(false);
  const { enabled, loading, restarting, loadAutoLiquidity, toggleAutoLiquidity } = useAutoLiquidity();

  const handleAuthorized = async () => {
    const result = await loadAutoLiquidity();
    if (result === "nwc") {
      addToast({ color: "warning", description: lightningCardTranslations("notAvailableNwc") });
      setShowAccess(false);
    }
  };

  const handleHide = () => setShowAccess(false);

  const handleToggle = async (newEnabled) => {
    const result = await toggleAutoLiquidity(newEnabled);
    if (result === "nwc") {
      addToast({ color: "warning", description: lightningCardTranslations("notAvailableNwc") });
      setShowAccess(false);
    } else if (result === "manual") {
      addToast({ color: "warning", description: lightningCardTranslations("manualRestartRequired") });
    } else if (result) {
      addToast({ color: "success", description: lightningCardTranslations("restartSuccess") });
    } else {
      addToast({ color: "danger", description: lightningCardTranslations("restartError") });
    }
  };

  if (showAccess) {
    return (
      <LightningCardUnlocked
        enabled={enabled}
        loading={loading}
        restarting={restarting}
        onToggle={handleToggle}
        onAuthorized={handleAuthorized}
        onHide={handleHide}
        lightningCardTranslations={lightningCardTranslations}
      />
    );
  }

  return (
    <LightningCardLocked
      onReveal={() => setShowAccess(true)}
      lightningCardTranslations={lightningCardTranslations}
    />
  );
}
