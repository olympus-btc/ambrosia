"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { PhoenixdRemoteCardLocked } from "./PhoenixdRemoteCardLocked";
import { PhoenixdRemoteCardUnlocked } from "./PhoenixdRemoteCardUnlocked";

export function PhoenixdRemoteCard() {
  const phoenixdRemoteCardTranslations = useTranslations();
  const [showAccess, setShowAccess] = useState(false);

  const handleHide = () => setShowAccess(false);

  if (showAccess) {
    return (
      <PhoenixdRemoteCardUnlocked
        onHide={handleHide}
        phoenixdRemoteCardTranslations={phoenixdRemoteCardTranslations}
      />
    );
  }

  return (
    <PhoenixdRemoteCardLocked
      onReveal={() => setShowAccess(true)}
      phoenixdRemoteCardTranslations={phoenixdRemoteCardTranslations}
    />
  );
}
