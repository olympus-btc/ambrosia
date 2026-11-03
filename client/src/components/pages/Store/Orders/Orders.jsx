"use client";
import { useTranslations } from "next-intl";

import { PageHeader } from "@components/shared/PageHeader";

import StoreOrders from "./StoreOrders";

export function Orders() {
  const ordersTranslations = useTranslations("orders");
  return (
    <>
      <PageHeader title={ordersTranslations("title")} subtitle={ordersTranslations("subtitle")} />
      <StoreOrders />
    </>
  );
}
