"use client";

import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/shared/CopyButton";

import { formatSats } from "../utils/formatters";

export function PaymentSentModal({ result, onClose }) {
  const t = useTranslations("wallet");

  return (
    <Modal
      isOpen={Boolean(result)}
      onClose={onClose}
      size="md"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader>{t("payments.send.paymentDone")}</ModalHeader>
        <ModalBody className="gap-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-forest" />
            <p className="text-xl font-semibold text-deep">
              {t("payments.send.paySuccessTitle")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("payments.send.amountSent")}</span>
              <span className="font-medium">{formatSats(result?.recipientAmountSat)} sats</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("payments.send.routingFee")}</span>
              <span className="font-medium">{formatSats(result?.routingFeeSat)} sats</span>
            </div>
          </div>

          <Divider />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("payments.send.paymentHash")}</span>
              <CopyButton
                value={result?.paymentHash ?? ""}
                label={t("payments.send.copyButton")}
                size="sm"
              />
            </div>
            <div className="bg-gray-100 rounded p-2 text-xs font-mono truncate sm:whitespace-normal sm:break-all">
              {result?.paymentHash}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
            onPress={onClose}
          >
            {t("payments.send.closeButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
