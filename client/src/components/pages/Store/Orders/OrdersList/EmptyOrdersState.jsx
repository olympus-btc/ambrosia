"use client";

import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";

export function EmptyOrdersState({ filter, searchTerm }) {
  const t = useTranslations("orders");
  const isInProgress = filter === "in-progress";

  const title = isInProgress ? t("empty.titleInProgress") : t("empty.titlePaid");
  const subtitle = searchTerm
    ? t("empty.subtitleSearch")
    : isInProgress
      ? t("empty.subtitleInProgress")
      : t("empty.subtitlePaid");

  return (
    <div className="text-center py-12">
      <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-deep mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{subtitle}</p>
    </div>
  );
}
