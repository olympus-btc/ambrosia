"use client";

import { useEffect, useState } from "react";

import { addToast, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";
import { SECRETS_UNLOCKED_EVENT, unlockSecrets } from "@/services/secretsService";
import { clearUnlockPassword, getStorageBackend, saveUnlockPassword } from "@/services/unlockPasswordStoreService";
import WalletGuard from "@components/auth/WalletGuard";

import { SecretsExistingPasswordField } from "./SecretsExistingPasswordField";
import { SecretsRememberPasswordCheckbox } from "./SecretsRememberPasswordCheckbox";

export function SecretsUnlockModal({ onClose }) {
  const secretsEncryptionCardTranslations = useTranslations();
  const [unlockPassword, setUnlockPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [storageBackend, setStorageBackend] = useState(null);
  const [rememberUnlockPassword, setRememberUnlockPassword] = useState(false);

  useEffect(() => {
    getStorageBackend().then(setStorageBackend).catch((storageBackendError) => {
      console.error(storageBackendError);
      setStorageBackend("basic_text");
    });
  }, []);

  const handleUnlockPasswordChange = (enteredPassword) => {
    setUnlockPassword(enteredPassword);
    setPasswordError("");
  };

  const handleUnlock = async () => {
    setSubmitting(true);
    try {
      await unlockSecrets(unlockPassword);
      if (rememberUnlockPassword) {
        await saveUnlockPassword(unlockPassword).catch(() => {});
      } else {
        await clearUnlockPassword().catch(() => {});
      }
      addToast({
        color: "success",
        description: secretsEncryptionCardTranslations("secretsEncryptionCard.unlockSuccess"),
      });
      window.dispatchEvent(new Event(SECRETS_UNLOCKED_EVENT));
      onClose?.();
    } catch (unlockSecretsError) {
      setPasswordError(unlockSecretsError.message || secretsEncryptionCardTranslations("secretsEncryptionCard.unlockError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WalletGuard
      onCancel={onClose}
      title={secretsEncryptionCardTranslations("secretsEncryptionCard.modalTitle")}
      passwordLabel={secretsEncryptionCardTranslations("secretsEncryptionCard.passwordLabel")}
      confirmText={secretsEncryptionCardTranslations("secretsEncryptionCard.confirmButton")}
      cancelText={secretsEncryptionCardTranslations("secretsEncryptionCard.cancelButton")}
    >
      <Modal
        isOpen
        onClose={onClose}
        isDismissable={false}
        hideCloseButton
        backdrop="blur"
        shouldBlockScroll={false}
        classNames={{
          backdrop: "backdrop-blur-xs bg-white/10",
          wrapper: "items-start h-auto",
          base: "my-auto overflow-hidden",
        }}
      >
        <ModalContent className="rounded-lg">
          <ModalHeader>{secretsEncryptionCardTranslations("secretsEncryptionCard.title")}</ModalHeader>
          <ModalBody className="pt-0 flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              {secretsEncryptionCardTranslations("secretsEncryptionCard.lockedDescription")}
            </p>
            <RequirePermission allOf={["settings_update"]}>
              <SecretsExistingPasswordField
                unlockPassword={unlockPassword}
                onUnlockPasswordChange={handleUnlockPasswordChange}
                passwordError={passwordError}
              />
            </RequirePermission>
            <SecretsRememberPasswordCheckbox
              storageBackend={storageBackend}
              rememberUnlockPassword={rememberUnlockPassword}
              onRememberUnlockPasswordChange={setRememberUnlockPassword}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              type="button"
              className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onPress={onClose}
            >
              {secretsEncryptionCardTranslations("secretsEncryptionCard.cancelButton")}
            </Button>
            <RequirePermission allOf={["settings_update"]}>
              <Button
                color="primary"
                isDisabled={!unlockPassword || submitting}
                isLoading={submitting}
                onPress={handleUnlock}
              >
                {secretsEncryptionCardTranslations("secretsEncryptionCard.unlockButton")}
              </Button>
            </RequirePermission>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </WalletGuard>
  );
}
