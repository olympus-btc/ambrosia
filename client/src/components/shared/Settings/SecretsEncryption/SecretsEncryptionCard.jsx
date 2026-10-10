"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { SecretsEncryptionCardDetails } from "./SecretsEncryptionCardDetails";
import { SecretsEncryptionCardSummary } from "./SecretsEncryptionCardSummary";

export function SecretsEncryptionCard() {
  const secretsEncryptionCardTranslations = useTranslations();
  const [showDetails, setShowDetails] = useState(false);

  const handleHide = () => setShowDetails(false);

  if (showDetails) {
    return (
      <SecretsEncryptionCardDetails
        onHide={handleHide}
        secretsEncryptionCardTranslations={secretsEncryptionCardTranslations}
      />
    );
  }

  return (
    <SecretsEncryptionCardSummary
      onReveal={() => setShowDetails(true)}
      secretsEncryptionCardTranslations={secretsEncryptionCardTranslations}
    />
  );
}
