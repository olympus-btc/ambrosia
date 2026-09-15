"use client";

import { useCallback, useEffect, useState } from "react";

import { getSecretsLockStatus, SECRETS_UNLOCKED_EVENT } from "@/services/secretsService";

export function useSecretsLockSignal({ enabled }) {
  const [secretsLocked, setSecretsLocked] = useState(false);

  const refreshSecretsLockStatus = useCallback(() => {
    getSecretsLockStatus()
      .then((secretsLockStatus) => setSecretsLocked(Boolean(secretsLockStatus?.locked)))
      .catch(() => setSecretsLocked(false));
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    refreshSecretsLockStatus();
    window.addEventListener(SECRETS_UNLOCKED_EVENT, refreshSecretsLockStatus);
    return () => window.removeEventListener(SECRETS_UNLOCKED_EVENT, refreshSecretsLockStatus);
  }, [enabled, refreshSecretsLockStatus]);

  return { secretsLocked: enabled ? secretsLocked : false };
}
