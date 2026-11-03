"use client";

import { useState } from "react";

import { addToast, Button, Card, CardBody, CardHeader } from "@heroui/react";

import { RequirePermission } from "@/hooks/usePermission";
import {
  getPhoenixdRemoteStatus,
  isSecretsLockedError,
  testPhoenixdConnection,
  updatePhoenixdRemote,
} from "@/services/walletService";
import { restartAppAfterPhoenixdRemoteChange } from "@/utils/restartAppAfterPhoenixdRemoteChange";
import WalletGuard from "@components/auth/WalletGuard";
import { PhoenixdRemoteFields } from "@components/shared/PhoenixdRemoteFields";
import { RestartRequiredModal } from "@components/shared/RestartRequiredModal";

import { PhoenixdRemoteActivatedModal } from "./PhoenixdRemoteActivatedModal";

export function PhoenixdRemoteCardUnlocked({ onHide, phoenixdRemoteCardTranslations }) {
  const [phoenixdRemote, setPhoenixdRemote] = useState(undefined);
  const [phoenixdUrl, setPhoenixdUrl] = useState("");
  const [phoenixdPassword, setPhoenixdPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showRemoteActivatedModal, setShowRemoteActivatedModal] = useState(false);

  const handleAuthorized = async () => {
    try {
      const phoenixdRemoteStatusResponse = await getPhoenixdRemoteStatus();
      setPhoenixdRemote(Boolean(phoenixdRemoteStatusResponse?.phoenixdRemote));
    } catch {
      addToast({ color: "danger", description: phoenixdRemoteCardTranslations("phoenixdRemoteCard.statusLoadError") });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await updatePhoenixdRemote({
        phoenixdRemote,
        phoenixdUrl: phoenixdRemote ? phoenixdUrl : undefined,
        phoenixdPassword: phoenixdRemote ? phoenixdPassword : undefined,
      });
      if (phoenixdRemote) {
        setShowRemoteActivatedModal(true);
        setPhoenixdUrl("");
        setPhoenixdPassword("");
      } else {
        setShowRestartModal(true);
      }
    } catch (updatePhoenixdRemoteError) {
      addToast({
        color: "danger",
        description: isSecretsLockedError(updatePhoenixdRemoteError)
          ? phoenixdRemoteCardTranslations("phoenixdRemoteCard.secretsLockedError")
          : updatePhoenixdRemoteError.message || phoenixdRemoteCardTranslations("phoenixdRemoteCard.errorGeneric"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WalletGuard
      onCancel={onHide}
      onAuthorized={handleAuthorized}
      title={phoenixdRemoteCardTranslations("phoenixdRemoteCard.modalTitle")}
      passwordLabel={phoenixdRemoteCardTranslations("phoenixdRemoteCard.passwordLabel")}
      confirmText={phoenixdRemoteCardTranslations("phoenixdRemoteCard.confirmButton")}
      cancelText={phoenixdRemoteCardTranslations("phoenixdRemoteCard.cancelButton")}
    >
      <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
        <CardHeader className="flex flex-col items-start">
          <h2 className="text-2xl font-semibold text-green-900">
            {phoenixdRemoteCardTranslations("phoenixdRemoteCard.title")}
          </h2>
        </CardHeader>

        <CardBody>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              {phoenixdRemoteCardTranslations("phoenixdRemoteCard.description")}
            </p>

            <RequirePermission allOf={["settings_update"]}>
              <PhoenixdRemoteFields
                phoenixdRemote={Boolean(phoenixdRemote)}
                phoenixdUrl={phoenixdUrl}
                phoenixdPassword={phoenixdPassword}
                onPhoenixdRemoteChange={setPhoenixdRemote}
                onPhoenixdUrlChange={setPhoenixdUrl}
                onPhoenixdPasswordChange={setPhoenixdPassword}
                onTestConnection={testPhoenixdConnection}
              />
            </RequirePermission>

            <div className="flex gap-2">
              <RequirePermission allOf={["settings_update"]}>
                <Button
                  color="primary"
                  className="bg-green-800 h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
                  isDisabled={phoenixdRemote === undefined || (phoenixdRemote && (!phoenixdUrl || !phoenixdPassword)) || submitting}
                  isLoading={submitting}
                  onPress={handleSubmit}
                >
                  {phoenixdRemoteCardTranslations("phoenixdRemoteCard.submitButton")}
                </Button>
              </RequirePermission>
              <Button
                variant="bordered"
                isDisabled={submitting}
                onPress={onHide}
                className="h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                {phoenixdRemoteCardTranslations("phoenixdRemoteCard.hideButton")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
      <RestartRequiredModal
        isOpen={showRestartModal}
        onManualClose={() => setShowRestartModal(false)}
        onRestart={restartAppAfterPhoenixdRemoteChange}
      />
      <PhoenixdRemoteActivatedModal
        isOpen={showRemoteActivatedModal}
        onAcknowledge={() => setShowRemoteActivatedModal(false)}
        phoenixdRemoteCardTranslations={phoenixdRemoteCardTranslations}
      />
    </WalletGuard>
  );
}
