"use client";

import { Chip } from "@heroui/react";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function StatusChip() {
  const t = useTranslations("orders");

  return (
    <Chip
      className="bg-green-200 text-xs text-green-800 border border-green-300"
      startContent={<CheckCircle className="w-3 h-3" />}
      size="sm"
    >
      {t("status.paid")}
    </Chip>
  );
}
