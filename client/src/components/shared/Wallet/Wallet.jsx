"use client";

import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";
import WalletGuard from "@components/auth/WalletGuard";
import { PageHeader } from "@components/shared/PageHeader";
import { PermissionBlockedMessage } from "@components/shared/PermissionBlockedMessage";

import { WalletDashboard } from "./WalletDashboard";

export function Wallet() {
  const walletTranslations = useTranslations("wallet");
  const canReadWallet = usePermission({ allOf: ["wallet_read"] });

  if (!canReadWallet) {
    return (
      <>
        <PageHeader title={walletTranslations("title")} subtitle={walletTranslations("subtitle")} />
        <PermissionBlockedMessage
          title={walletTranslations("permissionBlocked.title")}
          subtitle={walletTranslations("permissionBlocked.subtitle")}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={walletTranslations("title")} subtitle={walletTranslations("subtitle")} />
      <WalletGuard
        placeholder={<div className="min-h-screen gradient-fresh p-4" />}
        title={walletTranslations("access.title")}
        passwordLabel={walletTranslations("access.passwordLabel")}
        confirmText={walletTranslations("access.confirmText")}
        cancelText={walletTranslations("access.cancelText")}
      >
        <WalletDashboard />
      </WalletGuard>
    </>
  );
}
