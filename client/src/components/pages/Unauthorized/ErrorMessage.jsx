import { useTranslations } from "next-intl";

export function ErrorMessage() {
  const unauthorizedTranslations = useTranslations("unauthorized");

  return (
    <div className="text-center space-y-3">
      <p className="text-xs font-semibold tracking-widest text-forest/50 uppercase">
        {unauthorizedTranslations("errorCode")}
      </p>
      <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">{unauthorizedTranslations("heading")}</h2>
      <p className="text-sm text-gray-500 leading-relaxed">{unauthorizedTranslations("description")}</p>
    </div>
  );
}
