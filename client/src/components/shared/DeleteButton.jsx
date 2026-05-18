"use client";

import { Button } from "@heroui/react";
import { Trash } from "lucide-react";
import { useTranslations } from "next-intl";

export function DeleteButton({
  onPress,
  children,
  size = "sm",
  showLabelOnMobile = false,
  "aria-label": ariaLabel,
}) {
  const t = useTranslations("actions");
  const hasLabel = Boolean(children);
  const buttonClassName = hasLabel
    ? showLabelOnMobile
      ? "w-auto min-w-16 px-3"
      : "w-8 min-w-0 px-0 sm:w-auto sm:min-w-16 sm:px-3"
    : "w-8 min-w-0 px-0";

  return (
    <Button
      className={`border border-red-600 text-red-600 ${buttonClassName}`}
      onPress={onPress}
      size={size}
      variant="outline"
      aria-label={ariaLabel ?? t("delete")}
    >
      <Trash className="w-4 h-4" />
      {hasLabel && (
        <span className={showLabelOnMobile ? "" : "hidden sm:inline"}>
          {children}
        </span>
      )}
    </Button>
  );
}
