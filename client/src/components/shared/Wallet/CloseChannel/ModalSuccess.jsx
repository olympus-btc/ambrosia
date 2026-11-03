"use client";

import { Button, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/shared/CopyButton";

export function ModalSuccess({ txId, onClose }) {
  const walletTranslations = useTranslations("wallet");

  return (
    <>
      <ModalBody className="gap-4">
        <p className="font-semibold text-green-700">
          {walletTranslations("closeChannel.successTitle")}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">{walletTranslations("closeChannel.successTxIdLabel")}</p>
          <p className="text-xs font-mono break-all bg-gray-100 rounded p-2">{txId}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <CopyButton
          value={txId}
          label={walletTranslations("closeChannel.copyTxIdButton")}
        />
        <Button color="primary" onPress={onClose}>
          {walletTranslations("closeChannel.doneButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
