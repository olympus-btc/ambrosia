"use client";

import { Wallet, Layers, Globe, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatSats } from "../utils/formatters";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="border p-4 rounded-lg">
      <div className="flex items-center space-x-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-forest">{label}</span>
      </div>
      <p className="text-xl font-bold text-deep">{value}</p>
    </div>
  );
}

export function NodeSummary({ info, totalBalance }) {
  const t = useTranslations("wallet");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        value={info.channels?.length ?? 0}
      />
      <StatCard
        icon={Layers}
        label={t("nodeInfo.block")}
        value={info.blockHeight}
      />
    </div>
  );
}
