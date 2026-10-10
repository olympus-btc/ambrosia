"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { TutorialsCard } from "./TutorialsCard";
import { SEED_TOUR_SEEN_EVENT, TUTORIAL_TOUR, TUTORIAL_TOUR_DEFINITIONS } from "./tutorialTours";

export function Tutorials({ homeRoute, tours, onNavigate = (url) => window.location.assign(url) }) {
  const settingsTranslations = useTranslations("settings");
  const [seenTourNames, setSeenTourNames] = useState([]);

  useEffect(() => {
    setSeenTourNames(tours.filter((tourName) => TUTORIAL_TOUR_DEFINITIONS[tourName].isSeen()));

    const markSeedTourAsSeen = () => {
      setSeenTourNames((previousSeenTourNames) => [...new Set([...previousSeenTourNames, TUTORIAL_TOUR.SEED])]);
    };
    window.addEventListener(SEED_TOUR_SEEN_EVENT, markSeedTourAsSeen);
    return () => window.removeEventListener(SEED_TOUR_SEEN_EVENT, markSeedTourAsSeen);
  }, [tours]);

  const tutorialTours = tours.map((tourName) => ({
    tourName,
    translationKey: TUTORIAL_TOUR_DEFINITIONS[tourName].translationKey,
    isSeen: seenTourNames.includes(tourName),
    onReplay: () => {
      TUTORIAL_TOUR_DEFINITIONS[tourName].resetProgress();
      onNavigate(homeRoute);
    },
  }));

  return <TutorialsCard tutorialTours={tutorialTours} settingsTranslations={settingsTranslations} />;
}
