"use client";

import { useTranslations } from "next-intl";

import WalletGuard from "@components/auth/WalletGuard";
import { PageHeader } from "@components/shared/PageHeader";

import { StoreLayout } from "../StoreLayout";

import { StoreWallet } from "./StoreWallet";

export function Wallet() {
  const t = useTranslations("wallet");
  return (
    <StoreLayout>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <WalletGuard
        placeholder={<div className="min-h-screen gradient-fresh p-4" />}
        title={t("access.title")}
        passwordLabel={t("access.passwordLabel")}
        confirmText={t("access.confirmText")}
        cancelText={t("access.cancelText")}
      >
        <StoreWallet />
      </WalletGuard>
    </StoreLayout>
  );
}
