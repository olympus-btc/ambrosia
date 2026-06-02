"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

export function ProductTypeChip({ hasVariants }) {
  const t = useTranslations("products");

  if (hasVariants) {
    return (
      <Chip className="bg-blue-100 text-blue-800 border border-blue-200 text-xs" size="sm">
        {t("variants")}
      </Chip>
    );
  }

  return (
    <Chip className="bg-gray-100 text-gray-500 border border-gray-200 text-xs" size="sm">
      {t("simpleProduct")}
    </Chip>
  );
}
