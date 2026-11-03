"use client";

import { useState } from "react";

import { Tab, Tabs } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";

import { QRUrl } from "./QRUrl";

export function SettingsLayout({ subtitle, settingsTabs }) {
  const settingsTranslations = useTranslations("settings");
  const [activeTabKey, setActiveTabKey] = useState(settingsTabs[0]?.key);
  const activeSettingsTab = settingsTabs.find((settingsTab) => settingsTab.key === activeTabKey);

  return (
    <>
      <PageHeader
        title={settingsTranslations("title")}
        subtitle={subtitle}
        actions={(
          <span className="text-sm font-medium text-gray-800 bg-white px-4 py-2 rounded-full shadow-lg">
            {settingsTranslations("appVersion")}
            {process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        )}
      />

      <Tabs
        selectedKey={activeTabKey}
        onSelectionChange={setActiveTabKey}
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
        {settingsTabs.map((settingsTab) => (
          <Tab key={settingsTab.key} title={settingsTab.title} />
        ))}
      </Tabs>

      <div className="flex flex-col lg:flex-row-reverse gap-6 lg:items-start mt-6">
        <div className="hidden lg:block lg:w-80 lg:shrink-0">
          <QRUrl />
        </div>

        <div className="flex-1 min-w-0">
          {activeSettingsTab && (
            <div className="flex flex-col gap-6">
              {activeSettingsTab.content}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
