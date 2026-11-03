"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

export function LockedBadge({ isLocked, onClick, className }) {
  const secretsEncryptionTranslations = useTranslations("secretsEncryptionCard");

  if (!isLocked) return null;

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  };

  return (
    <button type="button" onClick={handleClick} className={className} aria-label={secretsEncryptionTranslations("lockedBadgeLabel")}>
      <Lock className="w-4 h-4" />
    </button>
  );
}
