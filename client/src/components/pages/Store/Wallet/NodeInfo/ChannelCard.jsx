"use client";

import { Button, Card, CardBody, Progress } from "@heroui/react";
import { useTranslations } from "next-intl";

import { formatSats } from "../utils/formatters";

const CHANNEL_STATE_NORMAL = "Normal";

const CLOSING_STATES = {
  ShuttingDown: "stateShuttingDown",
  Negotiating: "stateNegotiating",
  Closing: "stateClosing",
  Closed: "stateClosed",
};

function ChannelStateLabel({ state, t }) {
  if (state === CHANNEL_STATE_NORMAL) {
    return (
      <div className="flex items-center space-x-1 mt-1">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm text-forest">{state}</span>
      </div>
    );
  }
  const closingKey = CLOSING_STATES[state];
  if (closingKey) {
    return (
      <div className="flex items-center space-x-1 mt-1">
        <span className="w-2 h-2 rounded-full bg-orange-400" />
        <span className="text-sm text-orange-600">{t(`nodeInfo.${closingKey}`)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-1 mt-1">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-sm text-forest">{state}</span>
    </div>
  );
}

export function ChannelCard({ channel, index, onClose }) {
  const t = useTranslations("wallet");
  const isNormal = channel.state === CHANNEL_STATE_NORMAL;

  return (
    <Card className="border" shadow="none">
      <CardBody className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h5 className="font-semibold text-deep">
              {t("nodeInfo.channel")}{index + 1}
            </h5>
            <ChannelStateLabel state={channel.state} t={t} />
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <p className="font-bold text-deep">
                {formatSats(channel.balanceSat)} {t("nodeInfo.sats")}
              </p>
              <p className="text-sm text-forest">{t("nodeInfo.balanceSat")}</p>
            </div>
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
          <Button
            className="mt-4"
            size="sm"
            color="danger"
            onPress={() => onClose(channel)}
            isDisabled={!isNormal}
          >
            {t("closeChannel.buttonLabel")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
