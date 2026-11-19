"use client";

import { useState } from "react";

import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

import { ImageUploader } from "@components/shared/ImageUploader";
import { TimezoneInput } from "@components/shared/TimezoneInput";
import { TIMEZONES } from "@components/utils/timezones";

export function EditStoreInfoModal({ data, setData, onChange, onSubmit, isOpen, setIsOpen }) {
  const settingsTranslations = useTranslations("settings");
  const [rfcError, setRfcError] = useState("");

  if (!data) return null;

  const handleOnClose = () => {
    setData(data);
    setIsOpen(false);
  };

  const validateRFC = (rfcValue) => {
    const upperValue = rfcValue.toUpperCase();
    const rfcRegex = /^[A-ZÑ&]{3,4}(?:\d{2})(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

    if (!upperValue) {
      setRfcError("");
    } else if (upperValue.length === 13 && !rfcRegex.test(upperValue)) {
      setRfcError(settingsTranslations("step3.fields.businessRFCInvalid") || "RFC inválido. Debe tener formato correcto.");
    } else {
      setRfcError("");
    }

    onChange({ ...data, businessTaxId: upperValue });
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOnClose}
      scrollBehavior="inside"
      shouldBlockScroll={false}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader>
          {settingsTranslations("modal.title")}
        </ModalHeader>
        <ModalBody>
          <form
            className="space-y-4"
            onSubmit={onSubmit}
          >
            <Input
              label={settingsTranslations("modal.name")}
              type="text"
              placeholder={settingsTranslations("modal.namePlaceholder")}
              value={data.businessName ?? ""}
              onChange={(event) => onChange({ ...data, businessName: event.target.value })}
            />
            <Input
              label={settingsTranslations("modal.rfc")}
              type="text"
              placeholder="RFC"
              maxLength={13}
              value={data.businessTaxId}
              onChange={(event) => validateRFC(event.target.value)}
              isInvalid={!!rfcError}
              errorMessage={rfcError}
            />
            <Input
              label={settingsTranslations("modal.address")}
              type="text"
              placeholder={settingsTranslations("modal.addressPlaceholder")}
              value={data.businessAddress ?? ""}
              onChange={(event) => onChange({ ...data, businessAddress: event.target.value })}
            />
            <TimezoneInput
              label={settingsTranslations("modal.timezone")}
              timezones={TIMEZONES}
              selectedKey={data.timezone ?? null}
              onSelectionChange={(zoneId) => {
                if (zoneId) onChange({ ...data, timezone: zoneId });
              }}
            />
            <Input
              label={settingsTranslations("modal.email")}
              type="email"
              placeholder={settingsTranslations("modal.emailPlaceholder")}
              value={data?.businessEmail ?? ""}
              onChange={(event) => onChange({ ...data, businessEmail: event.target.value })}
            />
            <Input
              label={settingsTranslations("modal.phone")}
              type="tel"
              placeholder={settingsTranslations("modal.phonePlaceholder")}
              maxLength={10}
              value={data.businessPhone ?? ""}
              onChange={(event) => {
                const onlyNumbers = event.target.value.replace(/\D/g, "");
                onChange({ ...data, businessPhone: onlyNumbers });
              }}
            />

            <ImageUploader
              title={settingsTranslations("modal.logo")}
              uploadText={settingsTranslations("modal.logoUpload")}
              uploadDescription={settingsTranslations("modal.logoUploadMessage")}
              onChange={(file) => onChange({ ...data, businessLogo: file, businessLogoRemoved: file === null })}
              image={data.businessLogoRemoved ? null : (data.businessLogo || data.businessLogoUrl)}
            />

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={handleOnClose}
              >
                {settingsTranslations("modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
              >
                {settingsTranslations("modal.editButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
