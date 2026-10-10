"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { TutorialsCard } from "./TutorialsCard";

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";
const SEED_TOUR_KEY = "ambrosia:tour:seed";
const SEED_SETTINGS_TOUR_KEY = "ambrosia:tour:seed-settings";
const SEED_SEEN_KEY = "ambrosia:tour:seed-seen";

export function Tutorials({ onNavigate = (url) => window.location.assign(url) }) {
  const t = useTranslations("settings");
  const [walletTourSeen, setWalletTourSeen] = useState(false);
  const [seedTourSeen, setSeedTourSeen] = useState(false);

  useEffect(() => {
    setWalletTourSeen(localStorage.getItem(WALLET_TOUR_KEY) === "visited");
    setSeedTourSeen(Boolean(localStorage.getItem(SEED_SEEN_KEY)));

    const handler = () => setSeedTourSeen(true);
    window.addEventListener("seed-tour:seen", handler);
    return () => window.removeEventListener("seed-tour:seen", handler);
  }, []);

  const handleResetWalletTour = () => {
    localStorage.removeItem(WALLET_GUARD_TOUR_KEY);
    localStorage.removeItem(WALLET_RECEIVE_TOUR_KEY);
    localStorage.setItem(WALLET_TOUR_KEY, "true");
    localStorage.setItem(SEED_TOUR_KEY, "true");
    onNavigate("/store");
  };

  const handleResetSeedTour = () => {
    localStorage.removeItem(SEED_TOUR_KEY);
    localStorage.removeItem(SEED_SETTINGS_TOUR_KEY);
    onNavigate("/store");
  };

  return (
    <TutorialsCard
      walletTourSeen={walletTourSeen}
      seedTourSeen={seedTourSeen}
      onReplayWallet={handleResetWalletTour}
      onReplaySeed={handleResetSeedTour}
      t={t}
    />
  );
}
