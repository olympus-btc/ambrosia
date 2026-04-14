"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

const STATUS_STYLES = {
  paid: "bg-green-200 text-green-800 border border-green-300",
  open: "bg-blue-100 text-blue-800 border border-blue-200",
  closed: "bg-gray-200 text-gray-700 border border-gray-300",
};

export function StatusChip({ status }) {
  const t = useTranslations("orders");
  const className = STATUS_STYLES[status] ?? STATUS_STYLES.closed;

  return (
    <Chip className={`text-xs ${className}`} size="sm">
      {t(`status.${status}`)}
    </Chip>
  );
}
