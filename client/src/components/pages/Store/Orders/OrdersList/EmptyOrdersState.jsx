"use client";

import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";

export function EmptyOrdersState({ filter, searchTerm }) {
  const ordersTranslations = useTranslations("orders");
  const isInProgress = filter === "in-progress";

  const title = isInProgress ? ordersTranslations("empty.titleInProgress") : ordersTranslations("empty.titlePaid");
  const subtitle = searchTerm
    ? ordersTranslations("empty.subtitleSearch")
    : isInProgress
      ? ordersTranslations("empty.subtitleInProgress")
      : ordersTranslations("empty.subtitlePaid");

  return (
    <div className="text-center py-12">
      <ClipboardList aria-hidden="true" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-deep mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{subtitle}</p>
    </div>
  );
}
