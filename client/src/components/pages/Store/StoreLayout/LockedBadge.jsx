"use client";

import { Lock } from "lucide-react";

export function LockedBadge({ isLocked, onClick, className }) {
  if (!isLocked) return null;

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  };

  return (
    <button type="button" onClick={handleClick} className={className} aria-label="Secrets locked">
      <Lock className="w-4 h-4" />
    </button>
  );
}
