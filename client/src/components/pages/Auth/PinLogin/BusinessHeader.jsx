import { Image } from "@heroui/react";
import { useTranslations } from "next-intl";

export function BusinessHeader({ businessName, businessLogoUrl }) {
  const t = useTranslations("pinLogin");

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mx-auto w-16 h-16 bg-mint rounded-full flex items-center justify-center shadow-lg">
        <Image
          className="w-8 h-8 text-forest"
          src={businessLogoUrl || null}
          alt={businessName || ""}
        />
      </div>
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-deep">{businessName}</h1>
        <p className="text-forest mt-2 text-base text-center">{t("title")}</p>
      </div>
    </div>
  );
}
