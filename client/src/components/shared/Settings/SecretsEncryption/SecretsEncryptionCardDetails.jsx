"use client";

import { useState } from "react";

import { addToast, Button, Card, CardBody, CardHeader, Spinner } from "@heroui/react";

import { RequirePermission } from "@/hooks/usePermission";
import {
  activateSecretsEncryption,
  getSecretsStatus,
  SECRETS_UNLOCKED_EVENT,
  unlockSecrets,
} from "@/services/secretsService";
import { clearUnlockPassword, getStorageBackend, saveUnlockPassword } from "@/services/unlockPasswordStoreService";
import WalletGuard from "@components/auth/WalletGuard";
import { SecretsExistingPasswordField } from "@components/shared/SecretsExistingPasswordField";
import { SecretsRememberPasswordCheckbox } from "@components/shared/SecretsRememberPasswordCheckbox";
import { SecretsUnlockPasswordField } from "@components/shared/SecretsUnlockPasswordField";

const PASSWORD_ACTION_BUTTON_CLASS_NAME = "bg-green-800 h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium";
const HIDE_BUTTON_CLASS_NAME = "h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium border border-border text-foreground hover:bg-muted transition-colors";

export function SecretsEncryptionCardDetails({ onHide, secretsEncryptionCardTranslations }) {
  const [secretsStatus, setSecretsStatus] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockPasswordConfirmation, setUnlockPasswordConfirmation] = useState("");
  const [unlockPasswordError, setUnlockPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [storageBackend, setStorageBackend] = useState(null);
  const [rememberUnlockPassword, setRememberUnlockPassword] = useState(false);

  const handleUnlockPasswordChange = (enteredPassword) => {
    setUnlockPassword(enteredPassword);
    setUnlockPasswordError("");
  };

  const handleAuthorized = async () => {
    try {
      const secretsStatusResponse = await getSecretsStatus();
      setSecretsStatus(secretsStatusResponse);
    } catch {
      addToast({
        color: "danger",
        description: secretsEncryptionCardTranslations("secretsEncryptionCard.statusLoadError"),
      });
    }
    try {
      setStorageBackend(await getStorageBackend());
    } catch (storageBackendError) {
      console.error(storageBackendError);
      setStorageBackend("basic_text");
    }
  };

  const handleActivate = async () => {
    setSubmitting(true);
    try {
      await activateSecretsEncryption(unlockPassword);
      if (rememberUnlockPassword) {
        await saveUnlockPassword(unlockPassword).catch(() => {});
      } else {
        await clearUnlockPassword().catch(() => {});
      }
      addToast({ color: "success", description: secretsEncryptionCardTranslations("secretsEncryptionCard.activateSuccess") });
      setSecretsStatus({ encryptionActive: true, locked: false });
      window.dispatchEvent(new Event(SECRETS_UNLOCKED_EVENT));
      setUnlockPassword("");
      setUnlockPasswordConfirmation("");
    } catch (activateSecretsEncryptionError) {
      addToast({
        color: "danger",
        description:
          activateSecretsEncryptionError.message || secretsEncryptionCardTranslations("secretsEncryptionCard.activateError"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    setSubmitting(true);
    try {
      await unlockSecrets(unlockPassword);
      addToast({ color: "success", description: secretsEncryptionCardTranslations("secretsEncryptionCard.unlockSuccess") });
      setSecretsStatus({ encryptionActive: true, locked: false });
      window.dispatchEvent(new Event(SECRETS_UNLOCKED_EVENT));
      setUnlockPassword("");
    } catch (unlockSecretsError) {
      setUnlockPasswordError(unlockSecretsError.message || secretsEncryptionCardTranslations("secretsEncryptionCard.unlockError"));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusDependentContent = () => {
    if (!secretsStatus) {
      return (
        <div className="flex justify-center py-6">
          <Spinner size="lg" color="success" />
        </div>
      );
    }

    if (!secretsStatus.encryptionActive) {
      return (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            {secretsEncryptionCardTranslations("secretsEncryptionCard.inactiveDescription")}
          </p>

          <RequirePermission allOf={["settings_update"]}>
            <SecretsUnlockPasswordField
              unlockPassword={unlockPassword}
              onUnlockPasswordChange={setUnlockPassword}
              unlockPasswordConfirmation={unlockPasswordConfirmation}
              onUnlockPasswordConfirmationChange={setUnlockPasswordConfirmation}
            />
          </RequirePermission>

          <SecretsRememberPasswordCheckbox
            storageBackend={storageBackend}
            rememberUnlockPassword={rememberUnlockPassword}
            onRememberUnlockPasswordChange={setRememberUnlockPassword}
          />

          <div className="flex gap-2">
            <RequirePermission allOf={["settings_update"]}>
              <Button
                color="primary"
                className={PASSWORD_ACTION_BUTTON_CLASS_NAME}
                isDisabled={!unlockPassword || unlockPassword !== unlockPasswordConfirmation || submitting}
                isLoading={submitting}
                onPress={handleActivate}
              >
                {secretsEncryptionCardTranslations("secretsEncryptionCard.activateButton")}
              </Button>
            </RequirePermission>
            <Button variant="bordered" isDisabled={submitting} onPress={onHide} className={HIDE_BUTTON_CLASS_NAME}>
              {secretsEncryptionCardTranslations("secretsEncryptionCard.hideButton")}
            </Button>
          </div>
        </div>
      );
    }

    if (secretsStatus.locked) {
      return (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            {secretsEncryptionCardTranslations("secretsEncryptionCard.lockedDescription")}
          </p>

          <RequirePermission allOf={["settings_update"]}>
            <SecretsExistingPasswordField
              unlockPassword={unlockPassword}
              onUnlockPasswordChange={handleUnlockPasswordChange}
              passwordError={unlockPasswordError}
            />
          </RequirePermission>

          <div className="flex gap-2">
            <RequirePermission allOf={["settings_update"]}>
              <Button
                color="primary"
                className={PASSWORD_ACTION_BUTTON_CLASS_NAME}
                isDisabled={!unlockPassword || submitting}
                isLoading={submitting}
                onPress={handleUnlock}
              >
                {secretsEncryptionCardTranslations("secretsEncryptionCard.unlockButton")}
              </Button>
            </RequirePermission>
            <Button variant="bordered" isDisabled={submitting} onPress={onHide} className={HIDE_BUTTON_CLASS_NAME}>
              {secretsEncryptionCardTranslations("secretsEncryptionCard.hideButton")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-green-800 font-medium">
          {secretsEncryptionCardTranslations("secretsEncryptionCard.unlockedDescription")}
        </p>
        <div>
          <Button variant="bordered" onPress={onHide} className={HIDE_BUTTON_CLASS_NAME}>
            {secretsEncryptionCardTranslations("secretsEncryptionCard.hideButton")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <WalletGuard
      onCancel={onHide}
      onAuthorized={handleAuthorized}
      title={secretsEncryptionCardTranslations("secretsEncryptionCard.modalTitle")}
      passwordLabel={secretsEncryptionCardTranslations("secretsEncryptionCard.passwordLabel")}
      confirmText={secretsEncryptionCardTranslations("secretsEncryptionCard.confirmButton")}
      cancelText={secretsEncryptionCardTranslations("secretsEncryptionCard.cancelButton")}
    >
      <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
        <CardHeader className="flex flex-col items-start">
          <h2 className="text-2xl font-semibold text-green-900">
            {secretsEncryptionCardTranslations("secretsEncryptionCard.title")}
          </h2>
        </CardHeader>
        <CardBody>{renderStatusDependentContent()}</CardBody>
      </Card>
    </WalletGuard>
  );
}
