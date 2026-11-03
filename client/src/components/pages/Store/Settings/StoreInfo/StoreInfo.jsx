"use client";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useBusinessInfoEditor } from "@components/shared/Settings/hooks/useBusinessInfoEditor";

import { EditStoreInfoModal } from "./EditStoreInfoModal";
import { StoreInfoCard } from "./StoreInfoCard";

export function StoreInfo() {
  const settingsTranslations = useTranslations("settings");
  const {
    config,
    draftBusinessInfo,
    setDraftBusinessInfo,
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
        title: settingsTranslations("modal.updateSuccess"),
        color: "success",
      });
    } catch (saveStoreInfoError) {
      addToast({
        title: settingsTranslations("modal.errorTitle"),
        description: saveStoreInfoError.message,
        color: "danger",
      });
    }
  };

  if (!config) return null;

  return (
    <>
      <StoreInfoCard data={config} onEdit={openEditor} />
      <EditStoreInfoModal
        data={draftBusinessInfo}
        setData={setDraftBusinessInfo}
        onChange={handleDraftChange}
        onSubmit={handleSubmit}
        isOpen={isEditorOpen}
        setIsOpen={closeEditor}
      />
    </>
  );
}
