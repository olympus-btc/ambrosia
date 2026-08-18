"use client";

import { Button } from "@heroui/react";
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export function MarkReadButton({
  onPress,
  children,
  className = "",
  size = "sm",
  showLabelOnMobile = false,
  "aria-label": ariaLabel,
  ...props
}) {
  const actionTranslations = useTranslations("actions");
  const hasLabel = Boolean(children);
  const buttonClassName = hasLabel
    ? showLabelOnMobile
      ? "w-auto min-w-16 px-3"
      : "w-8 min-w-0 px-0 sm:w-auto sm:min-w-16 sm:px-3"
    : "w-8 h-8 min-w-0 px-0 shrink-0";

  return (
    <Button
      className={`border border-green-800 text-green-800 ${buttonClassName} ${className}`}
      onPress={onPress}
      size={size}
      variant="outline"
      aria-label={ariaLabel ?? actionTranslations("markRead")}
      {...props}
    >
      <CheckCheck className="w-4 h-4" />
      {hasLabel && (
        <span className={showLabelOnMobile ? "" : "hidden sm:inline"}>
          {children}
        </span>
      )}
    </Button>
  );
}
