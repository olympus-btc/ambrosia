"use client";

import { Button, Input, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

export function ModalForm({ form, isLoading, onCancel, onNext }) {
  const walletTranslations = useTranslations("wallet");
  const { address, feerate, errors, onAddressChange, onFeerateChange } = form;

  return (
    <>
      <ModalBody className="gap-4">
        <Input
          label={walletTranslations("closeChannel.addressLabel")}
          placeholder={walletTranslations("closeChannel.addressPlaceholder")}
          value={address}
          onValueChange={onAddressChange}
          isInvalid={!!errors.address}
          errorMessage={errors.address}
          isDisabled={isLoading}
        />
        <Input
          label={walletTranslations("closeChannel.feerateLabel")}
          placeholder={walletTranslations("closeChannel.feeratePlaceholder")}
          value={feerate}
          onValueChange={onFeerateChange}
          isInvalid={!!errors.feerate}
          errorMessage={errors.feerate}
          isDisabled={isLoading}
          type="number"
          min="1"
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onPress={onCancel}
        >
          {walletTranslations("closeChannel.cancelButton")}
        </Button>
        <Button color="primary" onPress={onNext}>
          {walletTranslations("closeChannel.nextButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
