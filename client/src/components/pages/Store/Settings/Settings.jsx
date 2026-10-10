"use client";

import { useState } from "react";

import { Tab, Tabs } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { Currency } from "@components/shared/Settings/Currency";
import { Display } from "@components/shared/Settings/Display";
import { ExportData } from "@components/shared/Settings/ExportData";
import { useSettingsAvailability } from "@components/shared/Settings/hooks/useSettingsAvailability";
import { ImportData } from "@components/shared/Settings/ImportData";
import { InstallPWA } from "@components/shared/Settings/InstallPWA";
import { Language } from "@components/shared/Settings/Language";
import { LightningCard } from "@components/shared/Settings/Lightning/LightningCard";
import { NotificationPreferencesCard } from "@components/shared/Settings/Notifications";
import { NwcConnectionCard } from "@components/shared/Settings/NwcConnection/NwcConnectionCard";
import { PhoenixdRemoteCard } from "@components/shared/Settings/PhoenixdRemote/PhoenixdRemoteCard";
import { QRUrl } from "@components/shared/Settings/QRUrl";
import { SecretsEncryptionCard } from "@components/shared/Settings/SecretsEncryption/SecretsEncryptionCard";
import { SecureConnection } from "@components/shared/Settings/SecureConnection/SecureConnection";
import { Seed } from "@components/shared/Settings/Seed";
import { SystemCard } from "@components/shared/Settings/System/SystemCard";
import { Tutorials } from "@components/shared/Settings/Tutorials";
import { TUTORIAL_TOUR } from "@components/shared/Settings/Tutorials/tutorialTours";
import { useNavigation } from "@hooks/useNavigation";
import { isElectron } from "@lib/isElectron";

import { STORE_HOME_ROUTE } from "../routes";

import { Printers } from "./Printers";
import { StoreInfo } from "./StoreInfo";
import { TicketTemplates } from "./TicketTemplates";
import { Tips } from "./Tips";

const STORE_TUTORIAL_TOURS = [TUTORIAL_TOUR.WALLET, TUTORIAL_TOUR.SEED];

function TabPanel({ children }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

export function Settings() {
  const settingsTranslations = useTranslations("settings");
  const { isAdmin } = useNavigation();
  const [activeTab, setActiveTab] = useState("business");
  const { availableTabs, secureConnectionAvailable, installPWAAvailable, devicesTabAvailable } = useSettingsAvailability({ isAdmin });

  return (
    <>
      <PageHeader
        title={settingsTranslations("title")}
        subtitle={settingsTranslations("subtitle")}
        actions={(
          <span className="text-sm font-medium text-gray-800 bg-white px-4 py-2 rounded-full shadow-lg">
            {settingsTranslations("appVersion")}
            {process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        )}
      />

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={setActiveTab}
        aria-label={settingsTranslations("title")}
        variant="solid"
        classNames={{
          base: "bg-white rounded-xl p-1 shadow-sm w-full",
          tabList: "gap-0 bg-transparent p-0 overflow-x-auto flex-nowrap",
          cursor: "bg-forest shadow-none rounded-lg",
          tab: "px-4 py-2 h-auto w-auto! rounded-lg shrink-0 data-[hover=true]:bg-forest/10",
          tabContent: "group-data-[selected=true]:text-white text-gray-500 group-data-[hover=true]:text-forest text-sm font-medium",
          panel: "hidden",
        }}
      >
        {availableTabs.map(({ key, label }) => (
          <Tab key={key} title={label} />
        ))}
      </Tabs>

      <div className="flex flex-col lg:flex-row-reverse gap-6 lg:items-start mt-6">
        <div className="hidden lg:block lg:w-80 lg:shrink-0">
          <QRUrl />
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === "business" && (
            <TabPanel>
              <StoreInfo />
              <Currency />
              <Tips />
            </TabPanel>
          )}

          {activeTab === "preferences" && (
            <TabPanel>
              <Language />
              <Display />
            </TabPanel>
          )}

          {activeTab === "wallet" && isAdmin && (
            <TabPanel>
              <Seed />
              {isElectron && <LightningCard />}
              <NwcConnectionCard />
              <PhoenixdRemoteCard />
              <SecretsEncryptionCard />
            </TabPanel>
          )}

          {activeTab === "backup" && isAdmin && (
            <TabPanel>
              <ExportData />
              <ImportData />
            </TabPanel>
          )}

          {activeTab === "devices" && devicesTabAvailable && (
            <TabPanel>
              {secureConnectionAvailable && <SecureConnection />}
              {installPWAAvailable && <InstallPWA />}
            </TabPanel>
          )}

          {activeTab === "printing" && (
            <TabPanel>
              <Printers />
              <TicketTemplates />
            </TabPanel>
          )}

          {activeTab === "system" && isAdmin && (
            <TabPanel>
              <SystemCard />
              <NotificationPreferencesCard />
            </TabPanel>
          )}

          {activeTab === "help" && isAdmin && (
            <TabPanel>
              <Tutorials homeRoute={STORE_HOME_ROUTE} tours={STORE_TUTORIAL_TOURS} />
            </TabPanel>
          )}
        </div>
      </div>
    </>
  );
}
