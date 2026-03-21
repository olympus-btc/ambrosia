"use client";

import { useEffect, useState } from "react";

import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { closeChannel } from "@/services/walletService";

import { copyToClipboard, formatSats } from "./utils/formatters";

function truncateAddress(address) {
  if (!address || address.length <= 20) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export function CloseChannelModal({ isOpen, onClose, channel, onSuccess }) {
  const t = useTranslations("wallet");
  const [step, setStep] = useState("form");
  const [address, setAddress] = useState("");
  const [feerate, setFeerate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [txId, setTxId] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setAddress("");
      setFeerate("");
      setIsLoading(false);
      setErrors({});
      setTxId("");
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!address.trim()) {
      newErrors.address = t("closeChannel.validationAddressRequired");
    }
    if (!feerate.trim()) {
      newErrors.feerate = t("closeChannel.validationFeerateRequired");
    } else if (!Number.isInteger(Number(feerate)) || Number(feerate) <= 0) {
      newErrors.feerate = t("closeChannel.validationFeerateInvalid");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await closeChannel(
        channel.channelId,
        address.trim(),
        parseInt(feerate, 10),
      );
      let extractedTxId = result?.txId ?? result?.txid ?? "";
      if (!extractedTxId && typeof result === "string") {
        try {
          const parsed = JSON.parse(result);
          extractedTxId = parsed?.txId ?? parsed?.txid ?? "";
        } catch {}
      }
      setTxId(extractedTxId);
      setStep("success");
      onSuccess?.();
    } catch (err) {
      addToast({
        title: t("closeChannel.errorToast"),
        description: err?.message,
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!channel) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader>
          <h3 className="text-lg font-bold">{t("closeChannel.modalTitle")}</h3>
        </ModalHeader>

        {step === "success" ? (
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
                variant="flat"
                onPress={() => copyToClipboard(txId, t)}
              >
                {t("closeChannel.copyTxIdButton")}
              </Button>
              <Button color="primary" onPress={onClose}>
                {t("closeChannel.doneButton")}
              </Button>
            </ModalFooter>
          </>
        ) : step === "form" ? (
          <>
            <ModalBody className="gap-4">
              <Input
                label={t("closeChannel.addressLabel")}
                placeholder={t("closeChannel.addressPlaceholder")}
                value={address}
                onValueChange={setAddress}
                isInvalid={!!errors.address}
                errorMessage={errors.address}
                isDisabled={isLoading}
              />
              <Input
                label={t("closeChannel.feerateLabel")}
                placeholder={t("closeChannel.feeratePlaceholder")}
                value={feerate}
                onValueChange={setFeerate}
                isInvalid={!!errors.feerate}
                errorMessage={errors.feerate}
                isDisabled={isLoading}
                type="number"
                min="1"
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                {t("closeChannel.cancelButton")}
              </Button>
              <Button color="warning" onPress={handleNext}>
                {t("closeChannel.nextButton")}
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalBody className="gap-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
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
                  <span className="text-gray-500">
                    {t("closeChannel.balanceSummaryLabel")}
                  </span>
                  <span className="font-medium">
                    {formatSats(channel.balanceSat)} {t("closeChannel.satUnit")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("closeChannel.addressSummaryLabel")}
                  </span>
                  <span className="font-medium font-mono">
                    {truncateAddress(address)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("closeChannel.feerateSummaryLabel")}
                  </span>
                  <span className="font-medium">{feerate} sat/byte</span>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setStep("form")} isDisabled={isLoading}>
                {t("closeChannel.backButton")}
              </Button>
              <Button
                color="danger"
                onPress={handleConfirm}
                isLoading={isLoading}
              >
                {t("closeChannel.confirmButton")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
