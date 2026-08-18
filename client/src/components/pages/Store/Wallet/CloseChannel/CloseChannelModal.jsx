"use client";

import { useEffect, useRef, useState } from "react";

import { addToast, Modal, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { closeChannel } from "@/services/walletService";

import { ModalConfirm } from "./ModalConfirm";
import { ModalForm } from "./ModalForm";
import { ModalSuccess } from "./ModalSuccess";

const isValidBitcoinAddress = (addr) => /^(1|3|bc1q|bc1p|m|n|2|tb1q|tb1p)[a-zA-HJ-NP-Z0-9]{25,89}$/.test(addr);

export function CloseChannelModal({ isOpen, onClose, channel, onSuccess }) {
  const walletTranslations = useTranslations("wallet");
  const [step, setStep] = useState("form");
  const [address, setAddress] = useState("");
  const [feerate, setFeerate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [txId, setTxId] = useState("");
  const isCloseChannelRequestPendingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setAddress("");
      setFeerate("");
      setIsLoading(false);
      setErrors({});
      setTxId("");
      isCloseChannelRequestPendingRef.current = false;
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!address.trim()) {
      newErrors.address = walletTranslations("closeChannel.validationAddressRequired");
    } else if (!isValidBitcoinAddress(address.trim())) {
      newErrors.address = walletTranslations("closeChannel.validationAddressInvalid");
    }
    if (!feerate.trim()) {
      newErrors.feerate = walletTranslations("closeChannel.validationFeerateRequired");
    } else if (!Number.isInteger(Number(feerate)) || Number(feerate) <= 0) {
      newErrors.feerate = walletTranslations("closeChannel.validationFeerateInvalid");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) setStep("confirm");
  };

  const handleConfirm = async () => {
    if (isCloseChannelRequestPendingRef.current) return;

    isCloseChannelRequestPendingRef.current = true;
    setIsLoading(true);
    try {
      const closeChannelResult = await closeChannel(channel.channelId, address.trim(), parseInt(feerate, 10));
      setTxId(closeChannelResult?.txId ?? "");
      setStep("success");
      addToast({
        title: walletTranslations("closeChannel.successTitle"),
        description: walletTranslations("closeChannel.successToast"),
        variant: "solid",
        color: "success",
      });
      onSuccess?.();
    } catch (closeChannelError) {
      addToast({
        title: walletTranslations("closeChannel.errorToast"),
        description: closeChannelError?.message,
        variant: "solid",
        color: "danger",
      });
    } finally {
      isCloseChannelRequestPendingRef.current = false;
      setIsLoading(false);
    }
  };

  if (!channel) return null;

  const modalForm = {
    address,
    feerate,
    errors,
    onAddressChange: setAddress,
    onFeerateChange: setFeerate,
  };

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
        <ModalHeader>{walletTranslations("closeChannel.modalTitle")}</ModalHeader>

        {step === "success" ? (
          <ModalSuccess txId={txId} onClose={onClose} />
        ) : step === "form" ? (
          <ModalForm
            form={modalForm}
            isLoading={isLoading}
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
