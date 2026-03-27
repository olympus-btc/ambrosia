"use client";

import { useState } from "react";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { CloseChannelModal } from "../CloseChannel/CloseChannelModal";

import { ChannelCard } from "./ChannelCard";
import { NodeSummary } from "./NodeSummary";

export function NodeInfo({ info, onRefresh }) {
  const t = useTranslations("wallet");
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const totalBalance = info?.channels
    ? info.channels
      .filter((channel) => channel.state === "Normal")
      .reduce((total, channel) => total + channel.balanceSat, 0)
    : 0;

  const handleOpenCloseModal = (channel) => {
    setSelectedChannel(channel);
    setIsCloseModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCloseModalOpen(false);
    setSelectedChannel(null);
  };

  return (
    <>
      <Card className="rounded-lg mb-6 p-6">
        <CardHeader>
          <h3 className="text-lg font-bold text-deep flex items-center">
            {t("nodeInfo.title")}
          </h3>
        </CardHeader>
        <CardBody>
          <NodeSummary info={info} totalBalance={totalBalance} />
          {!info.channels?.length ? (
            <div className="flex flex-col items-center py-8 text-forest opacity-60">
              <Zap className="w-8 h-8 mb-2" />
              <p className="text-sm">{t("nodeInfo.noChannels")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-semibold text-deep">{t("nodeInfo.subtitle")}</h4>
              {(info.channels ?? []).map((channel, index) => (
                <ChannelCard
                  key={channel.channelId}
                  channel={channel}
                  index={index}
                  onClose={handleOpenCloseModal}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {selectedChannel && (
        <CloseChannelModal
          isOpen={isCloseModalOpen}
          onClose={handleCloseModal}
          channel={selectedChannel}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
