"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { useSeedTour } from "@/hooks/tour/useSeedTour";
import { useSecretsLockSignal } from "@/hooks/useSecretsLockSignal";
import { BusinessLayout } from "@components/shared/BusinessLayout";
import { SecretsUnlockModal } from "@components/shared/SecretsUnlockModal";
import { useNavigation } from "@hooks/useNavigation";

import { FREELANCER_HOME_ROUTE, FREELANCER_SETTINGS_ROUTE, FREELANCER_WALLET_ROUTE } from "../routes";

export function FreelancerLayout({ children }) {
  const navbarTranslations = useTranslations("freelancerNavbar");
  const { isAuth } = useNavigation();
  const [isSecretsUnlockModalOpen, setIsSecretsUnlockModalOpen] = useState(false);
  const { secretsLocked } = useSecretsLockSignal({ enabled: isAuth });

  useSeedTour({ isAuth, homeRoute: FREELANCER_HOME_ROUTE, settingsRoute: FREELANCER_SETTINGS_ROUTE });

  return (
    <>
      <BusinessLayout
        navbarTranslations={navbarTranslations}
        lockedPaths={secretsLocked ? [FREELANCER_WALLET_ROUTE] : []}
        onLockedClick={() => setIsSecretsUnlockModalOpen(true)}
        withTourIds
      >
        {children}
      </BusinessLayout>

      {isSecretsUnlockModalOpen && <SecretsUnlockModal onClose={() => setIsSecretsUnlockModalOpen(false)} />}
    </>
  );
}
