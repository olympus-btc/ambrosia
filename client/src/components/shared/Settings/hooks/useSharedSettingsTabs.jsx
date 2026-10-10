"use client";

import { useTranslations } from "next-intl";

import { Display } from "@components/shared/Settings/Display";
import { ExportData } from "@components/shared/Settings/ExportData";
import { ImportData } from "@components/shared/Settings/ImportData";
import { InstallPWA } from "@components/shared/Settings/InstallPWA";
import { Language } from "@components/shared/Settings/Language";
import { LightningCard } from "@components/shared/Settings/Lightning/LightningCard";
import { NotificationPreferencesCard } from "@components/shared/Settings/Notifications";
import { NwcConnectionCard } from "@components/shared/Settings/NwcConnection/NwcConnectionCard";
import { PhoenixdRemoteCard } from "@components/shared/Settings/PhoenixdRemote/PhoenixdRemoteCard";
import { SecretsEncryptionCard } from "@components/shared/Settings/SecretsEncryption/SecretsEncryptionCard";
import { SecureConnection } from "@components/shared/Settings/SecureConnection/SecureConnection";
import { Seed } from "@components/shared/Settings/Seed";
import { SystemCard } from "@components/shared/Settings/System/SystemCard";
import { Tutorials } from "@components/shared/Settings/Tutorials";
import { useNavigation } from "@hooks/useNavigation";
import { isElectron } from "@lib/isElectron";

import { useSettingsAvailability } from "./useSettingsAvailability";

export function useSharedSettingsTabs({ homeRoute, tours }) {
  const settingsTranslations = useTranslations("settings");
  const { isAdmin } = useNavigation();
  const { secureConnectionAvailable, installPWAAvailable, devicesTabAvailable } = useSettingsAvailability();

  return {
    preferencesTab: {
      key: "preferences",
      title: settingsTranslations("categories.preferences"),
      content: (
        <>
          <Language />
          <Display />
        </>
      ),
    },
    walletTab: isAdmin && {
      key: "wallet",
      title: settingsTranslations("categories.wallet"),
      content: (
        <>
          <Seed />
          {isElectron && <LightningCard />}
          <NwcConnectionCard />
          <PhoenixdRemoteCard />
          <SecretsEncryptionCard />
        </>
      ),
    },
    backupTab: isAdmin && {
      key: "backup",
      title: settingsTranslations("categories.backup"),
      content: (
        <>
          <ExportData />
          <ImportData />
        </>
      ),
    },
    devicesTab: devicesTabAvailable && {
      key: "devices",
      title: settingsTranslations("categories.devices"),
      content: (
        <>
          {secureConnectionAvailable && <SecureConnection />}
          {installPWAAvailable && <InstallPWA />}
        </>
      ),
    },
    systemTab: isAdmin && {
      key: "system",
      title: settingsTranslations("categories.system"),
      content: (
        <>
          <SystemCard />
          <NotificationPreferencesCard />
        </>
      ),
    },
    helpTab: isAdmin && {
      key: "help",
      title: settingsTranslations("categories.help"),
      content: <Tutorials homeRoute={homeRoute} tours={tours} />,
    },
  };
}
