"use client";

import { Image } from "@heroui/react";

import { storedAssetUrl } from "@components/utils/storedAssetUrl";

const logoWidthClasses = {
  NORMAL: "w-1/3",
  LARGE: "w-1/2",
  EXTRA_LARGE: "w-2/3",
};

const logoAlignmentClasses = {
  LEFT: "items-start",
  CENTER: "items-center",
  RIGHT: "items-end",
};

export function ElementLogo({ templateText, businessConfig, fontSize, justification, className }) {
  const logoUrl = storedAssetUrl(templateText || businessConfig?.businessLogoUrl);
  const widthClass = logoWidthClasses[fontSize] || logoWidthClasses.NORMAL;
  const alignmentClass = logoAlignmentClasses[justification] || logoAlignmentClasses.LEFT;

  return (
    <div className={`flex flex-col ${alignmentClass} ${className}`}>
      <div className={widthClass} data-testid="logo-preview">
        {logoUrl ? (
          <Image src={logoUrl} alt="" radius="none" removeWrapper className="h-auto w-full" />
        ) : (
          <div className="flex aspect-[2/1] w-full items-center justify-center rounded-md border-2 border-dashed border-gray-400 text-xs text-gray-500">
            LOGO
          </div>
        )}
      </div>
    </div>
  );
}
