"use client";

import { useState } from "react";

import { useUpload } from "@components/hooks/useUpload";
import { useConfigurations } from "@providers/configurations/configurationsProvider";

export function useBusinessInfoEditor() {
  const { config, updateConfig } = useConfigurations();
  const { upload } = useUpload();
  const [draftBusinessInfo, setDraftBusinessInfo] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const openEditor = () => {
    setDraftBusinessInfo(config);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  const handleDraftChange = (changedFields) => {
    setDraftBusinessInfo((previousDraft) => ({ ...previousDraft, ...changedFields }));
  };

  const resolveLogoUrl = async () => {
    if (draftBusinessInfo.businessLogo instanceof File) {
      const [uploadedLogo] = await upload([draftBusinessInfo.businessLogo]);
      return uploadedLogo?.url ?? uploadedLogo?.path;
    }
    if (draftBusinessInfo.businessLogoRemoved) return null;
    return draftBusinessInfo.businessLogoUrl;
  };

  const saveBusinessInfo = async () => {
    const savedBusinessInfo = {
      ...draftBusinessInfo,
      businessLogoUrl: await resolveLogoUrl(),
      businessLogo: undefined,
      businessLogoRemoved: undefined,
    };

    await updateConfig(savedBusinessInfo);
    setDraftBusinessInfo(savedBusinessInfo);
    closeEditor();
  };

  return {
    config,
    draftBusinessInfo,
    setDraftBusinessInfo,
    isEditorOpen,
    openEditor,
    closeEditor,
    handleDraftChange,
    saveBusinessInfo,
  };
}
