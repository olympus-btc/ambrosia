"use client";

import { Checkbox, Tooltip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";
import { isElectron } from "@lib/isElectron";

export function SecretsRememberPasswordCheckbox({ storageBackend, rememberUnlockPassword, onRememberUnlockPasswordChange }) {
  const secretsEncryptionCardTranslations = useTranslations();

  if (!isElectron) {
    return null;
  }

  return (
    <RequirePermission allOf={["settings_update"]}>
      <Tooltip
        content={secretsEncryptionCardTranslations("secretsEncryptionCard.rememberUnavailableTooltip")}
        isDisabled={storageBackend !== "basic_text"}
      >
        <div className="w-fit">
          <Checkbox
            isSelected={rememberUnlockPassword}
            onValueChange={onRememberUnlockPasswordChange}
            isDisabled={!storageBackend || storageBackend === "basic_text"}
          >
            {secretsEncryptionCardTranslations("secretsEncryptionCard.rememberOnThisDevice")}
          </Checkbox>
        </div>
      </Tooltip>
    </RequirePermission>
  );
}
