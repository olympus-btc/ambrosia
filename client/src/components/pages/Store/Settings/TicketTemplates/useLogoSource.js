import { useState } from "react";

import { useUpload } from "@components/hooks/useUpload";
import { storedAssetUrl } from "@components/utils/storedAssetUrl";

const PRINTABLE_LOGO_TYPES = ["image/png", "image/jpeg"];

export function useLogoSource(templateText, onTemplateTextChange) {
  const [logoSource, setLogoSource] = useState(templateText ? "CUSTOM_IMAGE" : "BUSINESS_LOGO");
  const [uploadErrorKey, setUploadErrorKey] = useState(null);
  const [uploaderResetKey, setUploaderResetKey] = useState(0);
  const { upload: uploadFiles, isUploading } = useUpload();

  const selectLogoSource = (selectedLogoSource) => {
    setLogoSource(selectedLogoSource);
    setUploadErrorKey(null);
    if (selectedLogoSource === "BUSINESS_LOGO") onTemplateTextChange("");
  };

  const rejectLogoFile = (errorKey) => {
    setUploadErrorKey(errorKey);
    setUploaderResetKey((previousResetKey) => previousResetKey + 1);
  };

  const changeLogoImage = async (logoFile) => {
    setUploadErrorKey(null);
    if (!logoFile) {
      onTemplateTextChange("");
      return;
    }
    if (!PRINTABLE_LOGO_TYPES.includes(logoFile.type)) {
      rejectLogoFile("templates.logo.unsupportedFormat");
      return;
    }
    try {
      const [uploadedLogo] = await uploadFiles([logoFile]);
      if (uploadedLogo?.path) onTemplateTextChange(storedAssetUrl(uploadedLogo.path));
    } catch {
      rejectLogoFile("templates.logo.uploadError");
    }
  };

  return { logoSource, selectLogoSource, changeLogoImage, isUploading, uploadErrorKey, uploaderResetKey };
}
