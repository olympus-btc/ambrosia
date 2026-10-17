"use client";

import { useCallback, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { authenticateUser, logoutSession } from "@/lib/auth/authSession";
import { activateSecretsEncryption } from "@/services/secretsService";
import { loginWallet, logoutWallet } from "@/services/walletService";
import { useUpload } from "@components/hooks/useUpload";
import { submitInitialSetup } from "@services/initialSetupService";

const TOAST_REDIRECT_TIMEOUT_MS = 3000;

function addRedirectToast(toastProps) {
  addToast({
    ...toastProps,
    timeout: TOAST_REDIRECT_TIMEOUT_MS,
    shouldShowTimeoutProgress: true,
  });
}

function buildInitialSetupPayload(onboardingData, { businessLogoUrl, isPhoenixdRemoteAttempt }) {
  return {
    ...onboardingData,
    businessLogoUrl,
    businessLogo: undefined,
    userPasswordConfirmation: undefined,
    walletBackend: undefined,
    activateSecretsEncryption: undefined,
    nwcUri: onboardingData.walletBackend === "nwc" && onboardingData.nwcUri ? onboardingData.nwcUri : undefined,
    phoenixdRemote: isPhoenixdRemoteAttempt ? true : undefined,
    phoenixdUrl: isPhoenixdRemoteAttempt ? onboardingData.phoenixdUrl : undefined,
    phoenixdPassword: isPhoenixdRemoteAttempt ? onboardingData.phoenixdPassword : undefined,
  };
}

async function activateSecretsEncryptionAfterSetup({
  userName,
  userPin,
  userPassword,
  onboardingTranslations,
}) {
  try {
    await authenticateUser({ name: userName, pin: userPin, skipRefresh: true });
    await loginWallet(userPassword);
    await activateSecretsEncryption(userPassword);
  } catch (secretsEncryptionSetupError) {
    addToast({
      color: "danger",
      description:
        secretsEncryptionSetupError.message ||
        onboardingTranslations("submitOnboardingToast.secretsEncryptionErrorDescription"),
    });
  } finally {
    await logoutWallet().catch(() => {});
    await logoutSession({ skipRefresh: true }).catch(() => {});
  }
}

function getWalletBackendActivationToastProps(
  { nwcSaved, isNwcAttempt, phoenixdRemoteSaved, isPhoenixdRemoteAttempt },
  onboardingTranslations,
) {
  if (nwcSaved) {
    return {
      title: onboardingTranslations("submitOnboardingToast.nwcSavedTitle"),
      description: onboardingTranslations("submitOnboardingToast.nwcSavedDescription"),
      color: "primary",
    };
  }
  if (isNwcAttempt) {
    return {
      title: onboardingTranslations("submitOnboardingToast.nwcErrorTitle"),
      description: onboardingTranslations("submitOnboardingToast.nwcErrorDescription"),
      color: "danger",
    };
  }
  if (phoenixdRemoteSaved) {
    return {
      title: onboardingTranslations("submitOnboardingToast.phoenixdRemoteSavedTitle"),
      description: onboardingTranslations("submitOnboardingToast.phoenixdRemoteSavedDescription"),
      color: "primary",
    };
  }
  if (isPhoenixdRemoteAttempt) {
    return {
      title: onboardingTranslations("submitOnboardingToast.phoenixdRemoteErrorTitle"),
      description: onboardingTranslations("submitOnboardingToast.phoenixdRemoteErrorDescription"),
      color: "danger",
    };
  }
  return null;
}

export function useOnboardingSubmit({ onboardingData, needsBusinessType }) {
  const onboardingTranslations = useTranslations();
  const { upload } = useUpload();
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);
  const isSubmittingSetupRef = useRef(false);

  const handleComplete = useCallback(async () => {
    if (isSubmittingSetupRef.current) return;
    isSubmittingSetupRef.current = true;
    setIsSubmittingSetup(true);

    try {
      if (needsBusinessType) {
        await submitInitialSetup({
          businessType: onboardingData.businessType,
        });
        addRedirectToast({
          title: onboardingTranslations("submitOnboardingToast.title"),
          description: onboardingTranslations("submitOnboardingToast.description"),
          color: "success",
          onClose: () => window.location.reload(),
        });
        return;
      }

      let businessLogoUrl = null;
      if (onboardingData.businessLogo) {
        const [uploaded] = await upload([onboardingData.businessLogo]);
        businessLogoUrl = uploaded?.url ?? uploaded?.path;
      }

      const isPhoenixdRemoteAttempt = onboardingData.walletBackend === "phoenixd" && Boolean(onboardingData.phoenixdRemote);

      const setupResponse = await submitInitialSetup(
        buildInitialSetupPayload(onboardingData, { businessLogoUrl, isPhoenixdRemoteAttempt }),
      );

      const isNwcAttempt = onboardingData.walletBackend === "nwc";
      let nwcSaved = false;
      let phoenixdRemoteSaved = false;
      try {
        const setupResponseBody = await setupResponse.json();
        nwcSaved = Boolean(setupResponseBody?.nwcSaved);
        phoenixdRemoteSaved = Boolean(setupResponseBody?.phoenixdRemoteSaved);
      } catch {}

      if (onboardingData.activateSecretsEncryption) {
        await activateSecretsEncryptionAfterSetup({
          userName: onboardingData.userName,
          userPin: onboardingData.userPin,
          userPassword: onboardingData.userPassword,
          onboardingTranslations,
        });
      }

      addRedirectToast({
        title: onboardingTranslations("submitOnboardingToast.title"),
        description: onboardingTranslations("submitOnboardingToast.description"),
        color: "success",
        onClose: (isNwcAttempt || isPhoenixdRemoteAttempt) ? undefined : () => window.location.reload(),
      });

      const walletBackendActivationToastProps = getWalletBackendActivationToastProps(
        { nwcSaved, isNwcAttempt, phoenixdRemoteSaved, isPhoenixdRemoteAttempt },
        onboardingTranslations,
      );
      if (walletBackendActivationToastProps) {
        addRedirectToast({ ...walletBackendActivationToastProps, onClose: () => window.location.reload() });
      }
    } catch (setupSubmissionError) {
      addToast({
        title: onboardingTranslations("submitOnboardingToast.errorTitle"),
        description: setupSubmissionError.message,
        color: "danger",
      });
    } finally {
      isSubmittingSetupRef.current = false;
      setIsSubmittingSetup(false);
    }
  }, [needsBusinessType, onboardingData, onboardingTranslations, upload]);

  return { handleComplete, isSubmittingSetup };
}
