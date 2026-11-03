"use client";

import { Select, SelectItem } from "@heroui/react";

import { ImageUploader } from "@components/shared/ImageUploader";

const LOGO_SOURCES = ["BUSINESS_LOGO", "CUSTOM_IMAGE"];

export function LogoSourceSelect({ logoSource, onLogoSourceChange, settingsTranslations }) {
  return (
    <Select
      label={settingsTranslations("templates.logo.sourceLabel")}
      selectedKeys={[logoSource]}
      onChange={(event) => {
        if (event.target.value) onLogoSourceChange(event.target.value);
      }}
    >
      {LOGO_SOURCES.map((logoSourceOption) => (
        <SelectItem key={logoSourceOption} value={logoSourceOption}>
          {settingsTranslations(`templates.logo.sources.${logoSourceOption}`)}
        </SelectItem>
      ))}
    </Select>
  );
}

export function LogoImageSection({
  logoSource,
  templateText,
  businessConfig,
  onLogoImageChange,
  isUploading,
  uploadErrorKey,
  uploaderResetKey,
  settingsTranslations,
}) {
  const businessLogoUrl = businessConfig?.businessLogoUrl ?? "";
  const isBusinessLogoUnprintable = businessLogoUrl.toLowerCase().endsWith(".webp");

  return (
    <div className="mt-3 flex flex-col gap-2 empty:hidden">
      {logoSource === "BUSINESS_LOGO" && !businessLogoUrl && (
        <p className="text-xs text-gray-500">{settingsTranslations("templates.logo.missingBusinessLogo")}</p>
      )}

      {logoSource === "BUSINESS_LOGO" && isBusinessLogoUnprintable && (
        <p className="text-xs text-amber-600">{settingsTranslations("templates.logo.unprintableBusinessLogo")}</p>
      )}

      {logoSource === "CUSTOM_IMAGE" && (
        <ImageUploader
          key={uploaderResetKey}
          isCompact
          title=""
          image={templateText || null}
          onChange={onLogoImageChange}
          uploadText={settingsTranslations("templates.logo.chooseImage")}
          uploadDescription={settingsTranslations("templates.logo.imageDescription")}
        />
      )}

      {isUploading && <p className="text-xs text-gray-500">{settingsTranslations("templates.logo.uploading")}</p>}

      {uploadErrorKey && <p className="text-xs text-red-600">{settingsTranslations(uploadErrorKey)}</p>}
    </div>
  );
}
