"use client";

import { Button, ModalBody, ModalFooter } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/shared/CopyButton";

const PHOENIXD_ISSUES_URL = "https://github.com/ACINQ/phoenixd/issues";

export function ModalChannelNotAvailable({ channel, isLoading, onRetry, onClose }) {
  const walletTranslations = useTranslations("wallet");

  return (
    <>
      <ModalBody className="gap-4">
        <div className="flex items-start gap-3 border border-orange-400 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-orange-800 text-sm mb-1">
              {walletTranslations("closeChannel.stuckTitle")}
            </p>
            <p className="text-orange-700 text-sm">
              {walletTranslations("closeChannel.stuckDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-gray-500">{walletTranslations("closeChannel.stuckChannelIdLabel")}</p>
          <p className="text-xs font-mono break-all bg-gray-100 rounded p-2">{channel.channelId}</p>
        </div>

        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>{walletTranslations("closeChannel.stuckOptionRetry")}</li>
          <li>
            <a
              href={PHOENIXD_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {walletTranslations("closeChannel.stuckOptionContact")}
            </a>
          </li>
        </ul>
      </ModalBody>
      <ModalFooter>
        <CopyButton
          value={channel.channelId}
          label={walletTranslations("closeChannel.copyChannelIdButton")}
        />
        <Button variant="bordered" onPress={onClose} isDisabled={isLoading}>
          {walletTranslations("closeChannel.stuckCloseButton")}
        </Button>
        <Button color="primary" onPress={onRetry} isLoading={isLoading}>
          {walletTranslations("closeChannel.stuckRetryButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
