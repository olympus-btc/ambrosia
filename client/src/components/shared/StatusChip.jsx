"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

const STATUS_STYLES = {
  open: "bg-blue-100 text-blue-800 border border-blue-200",
  closed: "bg-gray-200 text-gray-700 border border-gray-300",
  paid: "bg-green-200 text-green-800 border border-green-300",
  refunded: "bg-purple-100 text-purple-800 border border-purple-200",
  refund: "bg-orange-100 text-orange-800 border border-orange-200",
};

export function StatusChip({ status }) {
  const statusTranslations = useTranslations("status");
  const className = STATUS_STYLES[status] ?? STATUS_STYLES.closed;

  return (
    <Chip className={`text-xs ${className}`} size="sm">
      {statusTranslations(status)}
    </Chip>
  );
}
