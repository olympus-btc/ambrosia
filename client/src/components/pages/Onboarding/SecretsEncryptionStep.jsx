"use client";

import { Checkbox } from "@heroui/react";
import { useTranslations } from "next-intl";

import { WalletPasswordEncryptionWarning } from "@components/shared/WalletPasswordEncryptionWarning";

export function SecretsEncryptionStep({ secretsEncryptionData, onChange }) {
  const secretsEncryptionTranslations = useTranslations();

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">
        {secretsEncryptionTranslations("stepSecretsEncryption.title")}
      </h2>
      <p className="text-gray-500 mb-4 md:mb-8">{secretsEncryptionTranslations("stepSecretsEncryption.subtitle")}</p>

      <Checkbox
        isSelected={Boolean(secretsEncryptionData.activateSecretsEncryption)}
        onValueChange={(activateSecretsEncryption) => onChange({ activateSecretsEncryption })}
      >
        {secretsEncryptionTranslations("stepSecretsEncryption.activateLabel")}
      </Checkbox>

      {secretsEncryptionData.activateSecretsEncryption && (
        <div className="mt-4 space-y-2">
          <WalletPasswordEncryptionWarning message={secretsEncryptionTranslations("stepSecretsEncryption.walletPasswordWarning")} />
          <p className="text-xs text-gray-400">{secretsEncryptionTranslations("stepSecretsEncryption.laterHint")}</p>
        </div>
      )}
    </div>
  );
}
