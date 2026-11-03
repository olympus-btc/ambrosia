"use client";

import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

import { ImageUploader } from "@components/shared/ImageUploader";
import { TimezoneInput } from "@components/shared/TimezoneInput";
import { TIMEZONES } from "@components/utils/timezones";

export function EditFreelancerInfoModal({ draftBusinessInfo, onDraftChange, onSubmit, isOpen, onClose }) {
  const freelancerSettingsTranslations = useTranslations("freelancerSettings");

  if (!draftBusinessInfo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
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
          {freelancerSettingsTranslations("infoModal.title")}
        </ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              label={freelancerSettingsTranslations("infoModal.name")}
              type="text"
              placeholder={freelancerSettingsTranslations("infoModal.namePlaceholder")}
              value={draftBusinessInfo.businessName ?? ""}
              onChange={(changeEvent) => onDraftChange({ businessName: changeEvent.target.value })}
            />
            <Input
              label={freelancerSettingsTranslations("infoModal.profession")}
              type="text"
              placeholder={freelancerSettingsTranslations("infoModal.professionPlaceholder")}
              value={draftBusinessInfo.businessProfession ?? ""}
              onChange={(changeEvent) => onDraftChange({ businessProfession: changeEvent.target.value })}
            />
            <Input
              label={freelancerSettingsTranslations("infoModal.taxId")}
              type="text"
              value={draftBusinessInfo.businessTaxId ?? ""}
              onChange={(changeEvent) => onDraftChange({ businessTaxId: changeEvent.target.value.toUpperCase() })}
            />
            <Input
              label={freelancerSettingsTranslations("infoModal.address")}
              type="text"
              placeholder={freelancerSettingsTranslations("infoModal.addressPlaceholder")}
              value={draftBusinessInfo.businessAddress ?? ""}
              onChange={(changeEvent) => onDraftChange({ businessAddress: changeEvent.target.value })}
            />
            <TimezoneInput
              label={freelancerSettingsTranslations("infoModal.timezone")}
              timezones={TIMEZONES}
              selectedKey={draftBusinessInfo.timezone ?? null}
              onSelectionChange={(zoneId) => {
                if (zoneId) onDraftChange({ timezone: zoneId });
              }}
            />
            <Input
              label={freelancerSettingsTranslations("infoModal.email")}
              type="email"
              placeholder={freelancerSettingsTranslations("infoModal.emailPlaceholder")}
              value={draftBusinessInfo.businessEmail ?? ""}
              onChange={(changeEvent) => onDraftChange({ businessEmail: changeEvent.target.value })}
            />
            <Input
              label={freelancerSettingsTranslations("infoModal.phone")}
              type="tel"
              placeholder={freelancerSettingsTranslations("infoModal.phonePlaceholder")}
              maxLength={10}
              value={draftBusinessInfo.businessPhone ?? ""}
              onChange={(changeEvent) => onDraftChange({ businessPhone: changeEvent.target.value.replace(/\D/g, "") })}
            />

            <ImageUploader
              title={freelancerSettingsTranslations("infoModal.logo")}
              uploadText={freelancerSettingsTranslations("infoModal.logoUpload")}
              uploadDescription={freelancerSettingsTranslations("infoModal.logoUploadMessage")}
              onChange={(file) => onDraftChange({ businessLogo: file, businessLogoRemoved: file === null })}
              image={draftBusinessInfo.businessLogoRemoved ? null : (draftBusinessInfo.businessLogo || draftBusinessInfo.businessLogoUrl)}
            />

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={onClose}
              >
                {freelancerSettingsTranslations("infoModal.cancelButton")}
              </Button>
              <Button color="primary" className="bg-green-800" type="submit">
                {freelancerSettingsTranslations("infoModal.saveButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
