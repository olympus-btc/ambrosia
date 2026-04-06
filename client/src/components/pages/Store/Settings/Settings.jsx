"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { isElectron } from "@lib/isElectron";

import { StoreLayout } from "../StoreLayout";

import { Currency } from "./Currency";
import { Language } from "./Language";
import { LightningCard } from "./Lightning/LightningCard";
import { Printers } from "./Printers";
import { Seed } from "./Seed";
import { StoreInfo } from "./StoreInfo";
import { TicketTemplates } from "./TicketTemplates";
import { Tutorials } from "./Tutorials";

export function Settings() {
  const t = useTranslations("settings");

  return (
    <StoreLayout>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <StoreInfo />
          <Currency />
          <Language />
          <Seed />
          <Tutorials />
        </div>

        <div className="flex flex-col gap-6">
          <Printers />
          <TicketTemplates />

          {isElectron && <LightningCard />}
        </div>
      </div>
    </StoreLayout>
  );
}
