"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { NwcConnectionCardLocked } from "./NwcConnectionCardLocked";
import { NwcConnectionCardUnlocked } from "./NwcConnectionCardUnlocked";

export function NwcConnectionCard() {
  const nwcConnectionTranslations = useTranslations();
  const [showAccess, setShowAccess] = useState(false);

  const handleHide = () => setShowAccess(false);

  if (showAccess) {
    return (
      <NwcConnectionCardUnlocked
        onHide={handleHide}
        nwcConnectionTranslations={nwcConnectionTranslations}
      />
    );
  }

  return (
    <NwcConnectionCardLocked
      onReveal={() => setShowAccess(true)}
      nwcConnectionTranslations={nwcConnectionTranslations}
    />
  );
}
