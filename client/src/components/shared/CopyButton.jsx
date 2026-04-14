"use client";

import { Button } from "@heroui/react";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";

import { copyToClipboard } from "@/components/pages/Store/Wallet/utils/copyToClipboard";

export function CopyButton({ value, label, ...props }) {
  const t = useTranslations("wallet");

  return (
    <Button
      variant="bordered"
      className="border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      onClick={() => copyToClipboard(value, t)}
      {...props}
    >
      <Copy className="w-3 h-3 mr-1" />
      {label}
    </Button>
  );
}
