"use client";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useBusinessInfoEditor } from "@components/shared/Settings/hooks/useBusinessInfoEditor";

import { EditFreelancerInfoModal } from "./EditFreelancerInfoModal";
import { FreelancerInfoCard } from "./FreelancerInfoCard";

export function FreelancerInfo() {
  const freelancerSettingsTranslations = useTranslations("freelancerSettings");
  const {
    config,
    draftBusinessInfo,
    isEditorOpen,
    openEditor,
    closeEditor,
    handleDraftChange,
    saveBusinessInfo,
  } = useBusinessInfoEditor();

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    try {
      await saveBusinessInfo();
      addToast({
        title: freelancerSettingsTranslations("infoModal.updateSuccess"),
        color: "success",
      });
    } catch (saveFreelancerInfoError) {
      addToast({
        title: freelancerSettingsTranslations("infoModal.errorTitle"),
        description: saveFreelancerInfoError.message,
        color: "danger",
      });
    }
  };

  if (!config) return null;

  return (
    <>
      <FreelancerInfoCard businessInfo={config} onEdit={openEditor} />
      <EditFreelancerInfoModal
        draftBusinessInfo={draftBusinessInfo}
        onDraftChange={handleDraftChange}
        onSubmit={handleSubmit}
        isOpen={isEditorOpen}
        onClose={closeEditor}
      />
    </>
  );
}
