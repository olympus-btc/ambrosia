"use client";

import { AlertTriangle } from "lucide-react";

export function WalletPasswordEncryptionWarning({ message }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">{message}</p>
    </div>
  );
}
