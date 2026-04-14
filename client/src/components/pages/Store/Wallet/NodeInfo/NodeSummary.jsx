"use client";

import { Wallet, Layers, Globe, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatSats } from "../utils/formatters";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="border p-3 sm:p-4 lg:p-3 xl:p-4 rounded-lg">
      <div className="flex items-center space-x-2 mb-2">
        <Icon className="hidden sm:block lg:hidden xl:block w-4 h-4 text-primary" />
        <span className="text-xs sm:text-sm lg:text-xs xl:text-sm font-medium text-forest">{label}</span>
      </div>
      <p className="text-base sm:text-xl lg:text-base xl:text-xl font-bold text-deep">{value}</p>
    </div>
  );
}

export function NodeSummary({ info, totalBalance }) {
  const t = useTranslations("wallet");

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <StatCard
        icon={Wallet}
        label={t("nodeInfo.totalBalance")}
        value={`${formatSats(totalBalance)} sats`}
      />
      <StatCard
        icon={Globe}
        label={t("nodeInfo.network")}
        value={info.chain}
      />
      <StatCard
        icon={Zap}
        label={t("nodeInfo.channels")}
        value={info.channels?.filter((channel) => channel.state === "Normal").length ?? 0}
      />
      <StatCard
        icon={Layers}
        label={t("nodeInfo.block")}
        value={info.blockHeight}
      />
    </div>
  );
}
