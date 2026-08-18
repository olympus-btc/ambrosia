"use client";

import { Wallet, Layers, Globe, Zap, AtSign } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatFiat, formatSats } from "../utils/formatters";

function StatCard({ icon: Icon, label, value, secondaryValue }) {
  return (
    <div className="border p-3 sm:p-4 lg:p-3 xl:p-4 rounded-lg">
      <div className="flex items-center space-x-2 mb-2">
        <Icon className="hidden sm:block lg:hidden xl:block w-4 h-4 text-primary" />
        <span className="text-xs sm:text-sm lg:text-xs xl:text-sm font-medium text-forest">{label}</span>
      </div>
      <p className="text-base sm:text-xl lg:text-base xl:text-xl font-bold text-deep">{value}</p>
      {secondaryValue && (
        <p className="text-xs sm:text-sm text-forest">{secondaryValue}</p>
      )}
    </div>
  );
}

export function NodeSummary({ info, totalBalance, currentRate, currencyAcronym, locale }) {
  const walletTranslations = useTranslations("wallet");
  const isNwcBackend = info.version === "NWC";

  const totalBalanceFiat = currentRate != null
    ? formatFiat({
      value: (totalBalance / 100_000_000) * currentRate,
      currencyAcronym,
      locale,
    })
    : null;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <StatCard
        icon={Wallet}
        label={walletTranslations("nodeInfo.totalBalance")}
        value={`${formatSats(totalBalance)} sats`}
        secondaryValue={totalBalanceFiat}
      />
      <StatCard
        icon={Globe}
        label={walletTranslations("nodeInfo.network")}
        value={info.chain}
      />
      {!isNwcBackend && (
        <>
          <StatCard
            icon={Zap}
            label={walletTranslations("nodeInfo.channels")}
            value={info.channels?.filter((channel) => channel.state?.toUpperCase() === "NORMAL").length ?? 0}
          />
          <StatCard
            icon={Layers}
            label={walletTranslations("nodeInfo.block")}
            value={info.blockHeight}
          />
        </>
      )}
      {isNwcBackend && info.lud16 && (
        <StatCard
          icon={AtSign}
          label={walletTranslations("nodeInfo.lightningAddress")}
          value={info.lud16}
        />
      )}
    </div>
  );
}
