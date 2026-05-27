"use client";

import { Button } from "@heroui/react";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

export function ViewButton({ onPress, children, size = "sm", "aria-label": ariaLabel }) {
  const t = useTranslations("actions");
  return (
    <Button
      className={`border border-green-800 text-green-800 w-8 min-w-0 px-0 ${children ? "sm:w-auto sm:min-w-16 sm:px-3" : ""}`}
      onPress={onPress}
      size={size}
      variant="outline"
      aria-label={ariaLabel ?? t("view")}
    >
      <Eye className="w-4 h-4" />
      {children && <span className="hidden sm:inline">{children}</span>}
    </Button>
  );
}
