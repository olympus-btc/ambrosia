"use client";

import { Button, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

import { copyToClipboard } from "../utils/formatters";

export function ModalSuccess({ txId, onClose }) {
  const t = useTranslations("wallet");

  return (
    <>
      <ModalBody className="gap-4">
        <p className="font-semibold text-green-700">
          {t("closeChannel.successTitle")}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">{t("closeChannel.successTxIdLabel")}</p>
          <p className="text-xs font-mono break-all bg-gray-100 rounded p-2">{txId}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onPress={() => copyToClipboard(txId, t)}
        >
          {t("closeChannel.copyTxIdButton")}
        </Button>
        <Button color="primary" onPress={onClose}>
          {t("closeChannel.doneButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
