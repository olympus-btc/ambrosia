"use client";

import { Bitcoin, CheckCircle, CreditCard, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatSats } from "../utils/formatters";

export function NodeSummary({ info, totalBalance }) {
  const t = useTranslations("wallet");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Bitcoin className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {t("nodeInfo.totalBalance")}
          </span>
        </div>
        <p className="text-2xl font-bold text-blue-900">
          {formatSats(totalBalance)} sats
        </p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {t("nodeInfo.network")}
          </span>
        </div>
        <p className="text-lg font-bold text-green-900">{info.chain}</p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">
            {t("nodeInfo.channels")}
          </span>
        </div>
        <p className="text-lg font-bold text-purple-900">
          {info.channels.length}
        </p>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <CreditCard className="w-5 h-5 text-orange-600" />
          <span className="text-sm font-medium text-orange-800">
            {t("nodeInfo.block")}
          </span>
        </div>
        <p className="text-lg font-bold text-orange-900">
          {info.blockHeight}
        </p>
      </div>
    </div>
  );
}
