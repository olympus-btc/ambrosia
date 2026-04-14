import { Image } from "@heroui/react";
import { useTranslations } from "next-intl";

export function BusinessHeader({ businessName, businessLogoUrl }) {
  const t = useTranslations("pinLogin");

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
        <Image
          className="w-10 h-10 object-contain"
          src={businessLogoUrl || null}
          alt={businessName || ""}
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold text-foreground">{businessName}</h1>
        <p className="text-default-500 text-sm text-center">{t("title")}</p>
      </div>
    </div>
  );
}
