"use client";

import { useState } from "react";

import { Button } from "@heroui/react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSecretsLockSignal } from "@/hooks/useSecretsLockSignal";

import { SecretsUnlockModal } from "./SecretsUnlockModal";

const BUTTON_CLASS_NAME = "h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium";

export function SecretsGatedRevealButton({ onReveal, revealLabel }) {
  const secretsEncryptionCardTranslations = useTranslations();
  const { secretsLocked } = useSecretsLockSignal({ enabled: true });
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);

  return (
    <>
      <Button
        color={secretsLocked ? "danger" : "primary"}
        className={secretsLocked ? BUTTON_CLASS_NAME : `bg-green-800 ${BUTTON_CLASS_NAME}`}
        startContent={secretsLocked ? <Lock className="w-4 h-4" /> : undefined}
        onPress={secretsLocked ? () => setUnlockModalOpen(true) : onReveal}
      >
        {secretsLocked ? secretsEncryptionCardTranslations("secretsEncryptionCard.unlockButton") : revealLabel}
      </Button>
      {unlockModalOpen && <SecretsUnlockModal onClose={() => setUnlockModalOpen(false)} />}
    </>
  );
}
