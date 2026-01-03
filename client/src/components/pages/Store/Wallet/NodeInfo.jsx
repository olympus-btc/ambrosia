"use client";

import {
  Card,
  CardBody,
  CardHeader,
  Progress,
} from "@heroui/react";
import {
  Zap,
  Bitcoin,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { formatSats } from "./utils/formatters";

export function NodeInfo({ info }) {
  const getTotalBalance = () => {
    if (!info?.channels) return 0;
    return info.channels.reduce((total, ch) => total + ch.balanceSat, 0);
  };
  const t = useTranslations("wallet");
  return (
    <Card className="rounded-lg mb-6 p-6">
      <CardHeader>
        <h3 className="text-lg font-bold text-deep flex items-center">
          {t("nodeInfo.title")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Bitcoin className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {t("nodeInfo.totalBalance")}
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {formatSats(getTotalBalance())} sats
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

        <div className="space-y-3">
          <h4 className="font-semibold text-deep">{t("nodeInfo.subtitle")}</h4>
          {info.channels.map((channel, index) => (
            <Card key={channel.channelId} className="border">
              <CardBody className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-semibold text-deep">
                      {t("nodeInfo.channel")}{index + 1}
                    </h5>
                    <div className="flex items-center space-x-1 mt-1">
                      <span
                        className={`w-2 h-2 rounded-full ${channel.state === "Normal" ? "bg-green-500" : "bg-red-500"}`}
                      />
                      <span className="text-sm text-forest">
                        {channel.state}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-deep">
                      {formatSats(channel.balanceSat)} {t("nodeInfo.sats")}
                    </p>
                    <p className="text-sm text-forest">{t("nodeInfo.balanceSat")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-forest">{t("nodeInfo.capacitySat")}</span>
                    <span className="font-medium">
                      {formatSats(channel.capacitySat)} {t("nodeInfo.sats")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-forest">{t("nodeInfo.inboundLiquidity")}</span>
                    <span className="font-medium">
                      {formatSats(channel.inboundLiquiditySat)} {t("nodeInfo.sats")}
                    </span>
                  </div>
                  <Progress
                    aria-label="Balance Channel"
                    value={(channel.balanceSat / channel.capacitySat) * 100}
                    className="max-w-full"
                    color="primary"
                    size="sm"
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
