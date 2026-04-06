"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { TutorialsCard } from "./TutorialsCard";

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

export function Tutorials({ onNavigate = (url) => window.location.assign(url) }) {
  const t = useTranslations("settings");
  const [walletTourSeen] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem(WALLET_TOUR_KEY)),
  );

  const handleResetWalletTour = () => {
    localStorage.removeItem(WALLET_TOUR_KEY);
    localStorage.removeItem(WALLET_GUARD_TOUR_KEY);
    localStorage.removeItem(WALLET_RECEIVE_TOUR_KEY);
    onNavigate("/store");
  };

  return (
    <TutorialsCard
      walletTourSeen={walletTourSeen}
      onReplay={handleResetWalletTour}
      t={t}
    />
  );
}
