"use client";

import { Button, Input, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

export function ModalForm({ address, feerate, errors, isLoading, onAddressChange, onFeerateChange, onCancel, onNext }) {
  const t = useTranslations("wallet");

  return (
    <>
      <ModalBody className="gap-4">
        <Input
          label={t("closeChannel.addressLabel")}
          placeholder={t("closeChannel.addressPlaceholder")}
          value={address}
          onValueChange={onAddressChange}
          isInvalid={!!errors.address}
          errorMessage={errors.address}
          isDisabled={isLoading}
        />
        <Input
          label={t("closeChannel.feerateLabel")}
          placeholder={t("closeChannel.feeratePlaceholder")}
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
          {t("closeChannel.cancelButton")}
        </Button>
        <Button color="primary" onPress={onNext}>
          {t("closeChannel.nextButton")}
        </Button>
      </ModalFooter>
    </>
  );
}
