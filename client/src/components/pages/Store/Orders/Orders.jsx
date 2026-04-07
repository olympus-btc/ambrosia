"use client";
import { useTranslations } from "next-intl";

import { PageHeader } from "@components/shared/PageHeader";

import { StoreLayout } from "../StoreLayout";

import StoreOrders from "./StoreOrders";

export function Orders() {
  const t = useTranslations("orders");
  return (
    <StoreLayout>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <StoreOrders />
    </StoreLayout>
  );
}
