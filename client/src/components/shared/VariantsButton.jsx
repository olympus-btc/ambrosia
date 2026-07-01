"use client";

import { Button } from "@heroui/react";
import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";

export function VariantsButton({ onPress, children, size = "sm", "aria-label": ariaLabel }) {
  const productsTranslations = useTranslations("products");
  return (
    <Button
      className={`border border-green-800 text-green-800 w-8 min-w-0 px-0 ${children ? "sm:w-auto sm:min-w-16 sm:px-3" : ""}`}
      onPress={onPress}
      size={size}
      variant="outline"
      aria-label={ariaLabel ?? productsTranslations("manageVariants")}
    >
      <Layers className="w-4 h-4" />
      {children && <span className="hidden sm:inline">{children}</span>}
    </Button>
  );
}
