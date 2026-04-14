"use client";

import { useEffect, useState } from "react";

import { addToast, Modal, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { closeChannel } from "@/services/walletService";

import { ModalConfirm } from "./ModalConfirm";
import { ModalForm } from "./ModalForm";
import { ModalSuccess } from "./ModalSuccess";

const isValidBitcoinAddress = (addr) => /^(1|3|bc1q|bc1p|m|n|2|tb1q|tb1p)[a-zA-HJ-NP-Z0-9]{25,89}$/.test(addr);

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
    } else if (!isValidBitcoinAddress(address.trim())) {
      newErrors.address = t("closeChannel.validationAddressInvalid");
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
    if (validate()) setStep("confirm");
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await closeChannel(channel.channelId, address.trim(), parseInt(feerate, 10));
      setTxId(result?.txId ?? "");
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
        body: "overflow-y-auto max-h-[65vh]",
      }}
    >
      <ModalContent>
        <ModalHeader>{t("closeChannel.modalTitle")}</ModalHeader>

        {step === "success" ? (
          <ModalSuccess txId={txId} onClose={onClose} />
        ) : step === "form" ? (
          <ModalForm
            address={address}
            feerate={feerate}
            errors={errors}
            isLoading={isLoading}
            onAddressChange={setAddress}
            onFeerateChange={setFeerate}
            onCancel={onClose}
            onNext={handleNext}
          />
        ) : (
          <ModalConfirm
            channel={channel}
            address={address}
            feerate={feerate}
            isLoading={isLoading}
            onBack={() => setStep("form")}
            onConfirm={handleConfirm}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
