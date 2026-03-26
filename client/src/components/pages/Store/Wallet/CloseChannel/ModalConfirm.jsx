"use client";

import { Button, ModalBody, ModalFooter } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatSats } from "../utils/formatters";

function truncateAddress(address) {
  if (!address || address.length <= 20) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export function ModalConfirm({ channel, address, feerate, isLoading, onBack, onConfirm }) {
  const t = useTranslations("wallet");

  return (
    <>
      <ModalBody className="gap-4">
        <div className="flex items-start gap-3 border border-red-400 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-red-800 text-sm mb-1">
              {t("closeChannel.confirmTitle")}
            </p>
            <p className="text-red-700 text-sm">
              {t("closeChannel.confirmDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("closeChannel.balanceSummaryLabel")}</span>
            <span className="font-medium">
              {formatSats(channel.balanceSat)} {t("closeChannel.satUnit")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("closeChannel.addressSummaryLabel")}</span>
            <span className="font-medium font-mono">{truncateAddress(address)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t("closeChannel.feerateSummaryLabel")}</span>
            <span className="font-medium">{feerate} sat/byte</span>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onPress={onBack}
          isDisabled={isLoading}
        >
          {t("closeChannel.backButton")}
        </Button>
        <Button color="danger" onPress={onConfirm} isLoading={isLoading}>
          {t("closeChannel.confirmButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
