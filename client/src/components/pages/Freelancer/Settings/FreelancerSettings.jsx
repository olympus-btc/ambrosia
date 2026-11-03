"use client";

import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";
import { SettingsLayout } from "@components/shared/Settings";
import { Currency } from "@components/shared/Settings/Currency";
import { useSharedSettingsTabs } from "@components/shared/Settings/hooks/useSharedSettingsTabs";
import { TUTORIAL_TOUR } from "@components/shared/Settings/Tutorials/tutorialTours";

import { FREELANCER_HOME_ROUTE } from "../routes";

import { FreelancerInfo } from "./FreelancerInfo";
import { PayoutAccounts } from "./PayoutAccounts";

const FREELANCER_TUTORIAL_TOURS = [TUTORIAL_TOUR.SEED];

export function FreelancerSettings() {
  const settingsTranslations = useTranslations("settings");
  const freelancerSettingsTranslations = useTranslations("freelancerSettings");
  const canReadPayoutAccounts = usePermission({ allOf: ["payout_accounts_read"] });
  const sharedSettingsTabs = useSharedSettingsTabs({ homeRoute: FREELANCER_HOME_ROUTE, tours: FREELANCER_TUTORIAL_TOURS });

  const freelancerSettingsTabs = [
    {
      key: "business",
      title: settingsTranslations("categories.business"),
      content: (
        <>
          <FreelancerInfo />
          <Currency />
        </>
      ),
    },
    sharedSettingsTabs.preferencesTab,
    sharedSettingsTabs.walletTab,
    canReadPayoutAccounts && {
      key: "payoutAccounts",
      title: freelancerSettingsTranslations("categories.payoutAccounts"),
      content: <PayoutAccounts />,
    },
    sharedSettingsTabs.backupTab,
    sharedSettingsTabs.devicesTab,
    sharedSettingsTabs.systemTab,
    sharedSettingsTabs.helpTab,
  ].filter(Boolean);

  return <SettingsLayout subtitle={freelancerSettingsTranslations("subtitle")} settingsTabs={freelancerSettingsTabs} />;
}
