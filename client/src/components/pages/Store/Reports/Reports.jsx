"use client";
import { useTranslations } from "next-intl";

import { PageHeader } from "@components/shared/PageHeader";

import { StoreReports } from "./StoreReports";

export default function Reports() {
  const t = useTranslations("reports");
  return (
    <>
      <PageHeader title={t("header.title")} subtitle={t("header.subtitle")} />
      <StoreReports />
    </>
  );
}
