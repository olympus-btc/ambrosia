"use client";

import { useTranslations } from "next-intl";

import { SettingsLayout } from "@components/shared/Settings";
import { Currency } from "@components/shared/Settings/Currency";
import { useSharedSettingsTabs } from "@components/shared/Settings/hooks/useSharedSettingsTabs";
import { TUTORIAL_TOUR } from "@components/shared/Settings/Tutorials/tutorialTours";

import { STORE_HOME_ROUTE } from "../routes";

import { PriceStep } from "./PriceStep";
import { Printers } from "./Printers";
import { StoreInfo } from "./StoreInfo";
import { TicketTemplates } from "./TicketTemplates";
import { Tips } from "./Tips";

const STORE_TUTORIAL_TOURS = [TUTORIAL_TOUR.WALLET, TUTORIAL_TOUR.SEED];

export function StoreSettings() {
  const settingsTranslations = useTranslations("settings");
  const sharedSettingsTabs = useSharedSettingsTabs({ homeRoute: STORE_HOME_ROUTE, tours: STORE_TUTORIAL_TOURS });

  const storeSettingsTabs = [
    {
      key: "business",
      title: settingsTranslations("categories.business"),
      content: (
        <>
          <StoreInfo />
          <Currency extraCurrencySettings={<PriceStep />} />
          <Tips />
        </>
      ),
    },
    sharedSettingsTabs.preferencesTab,
    sharedSettingsTabs.walletTab,
    sharedSettingsTabs.backupTab,
    sharedSettingsTabs.devicesTab,
    {
      key: "printing",
      title: settingsTranslations("categories.printing"),
      content: (
        <>
          <Printers />
          <TicketTemplates />
        </>
      ),
    },
    sharedSettingsTabs.systemTab,
    sharedSettingsTabs.helpTab,
  ].filter(Boolean);

  return <SettingsLayout subtitle={settingsTranslations("subtitle")} settingsTabs={storeSettingsTabs} />;
}
