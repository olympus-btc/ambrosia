"use client";

import { useTranslations } from "next-intl";

import { StoreLayout } from "../StoreLayout";

import { StoreWallet } from "./StoreWallet";

export function Wallet() {
  const t = useTranslations("wallet");
  return (
    <StoreLayout>
      <header className="mb-6">
        <h1 className="text-4xl font-semibold text-green-900">
          {t("title")}
        </h1>
        <p className="text-gray-800 mt-4">
          {t("subtitle")}
        </p>
      </header>
      <StoreWallet />
    </StoreLayout>
  );
}
