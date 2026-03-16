import { useTranslations } from "next-intl";

export function ErrorMessage() {
  const t = useTranslations("unauthorized");

  return (
    <div className="text-center space-y-3">
      <p className="text-xs font-semibold tracking-widest text-forest/50 uppercase">
        {t("errorCode")}
      </p>
      <h2 className="text-3xl font-bold text-deep">{t("heading")}</h2>
      <p className="text-forest text-base leading-relaxed">{t("description")}</p>
    </div>
  );
}
