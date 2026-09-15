"use client";

import { useState } from "react";

import { Input } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

export function SecretsExistingPasswordField({ unlockPassword, onUnlockPasswordChange, passwordError }) {
  const secretsEncryptionCardTranslations = useTranslations();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      label={secretsEncryptionCardTranslations("secretsEncryptionCard.unlockPasswordLabel")}
      type={showPassword ? "text" : "password"}
      value={unlockPassword}
      onValueChange={onUnlockPasswordChange}
      isInvalid={Boolean(passwordError)}
      errorMessage={passwordError}
      endContent={(
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
    />
  );
}
