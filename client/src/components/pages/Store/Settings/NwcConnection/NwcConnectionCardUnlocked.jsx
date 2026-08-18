"use client";

import { useState } from "react";

import { addToast, Button, Card, CardBody, CardHeader, Input } from "@heroui/react";

import { NWC_URI_REGEX } from "@/lib/nwcUri";
import { updateNwcUri } from "@/services/walletService";
import WalletGuard from "@components/auth/WalletGuard";

import { getNwcConnectionErrorDescription } from "./utils/nwcConnectionErrors";

export function NwcConnectionCardUnlocked({ onHide, nwcConnectionTranslations }) {
  const [nwcUri, setNwcUri] = useState("");
  const [uriError, setUriError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleUriChange = (value) => {
    setNwcUri(value);
    setUriError("");
  };

  const handleSubmit = async () => {
    if (!NWC_URI_REGEX.test(nwcUri)) {
      setUriError(nwcConnectionTranslations("nwcConnection.uriInvalid"));
      return;
    }

    setSubmitting(true);
    try {
      await updateNwcUri(nwcUri);
      addToast({ color: "success", description: nwcConnectionTranslations("nwcConnection.success") });
      setNwcUri("");
    } catch (error) {
      addToast({
        color: "danger",
        description: getNwcConnectionErrorDescription(nwcConnectionTranslations, error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WalletGuard
      onCancel={onHide}
      title={nwcConnectionTranslations("nwcConnection.modalTitle")}
      passwordLabel={nwcConnectionTranslations("nwcConnection.passwordLabel")}
      confirmText={nwcConnectionTranslations("nwcConnection.confirmButton")}
      cancelText={nwcConnectionTranslations("nwcConnection.cancelButton")}
    >
      <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
        <CardHeader className="flex flex-col items-start">
          <h2 className="text-2xl font-semibold text-green-900">
            {nwcConnectionTranslations("nwcConnection.title")}
          </h2>
        </CardHeader>

        <CardBody>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              {nwcConnectionTranslations("nwcConnection.description")}
            </p>

            <Input
              label={nwcConnectionTranslations("nwcConnection.uriLabel")}
              placeholder="nostr+walletconnect://..."
              value={nwcUri}
              onValueChange={handleUriChange}
              isInvalid={!!uriError}
              errorMessage={uriError}
              classNames={{ input: "font-mono text-xs" }}
            />

            <div className="flex gap-2">
              <Button
                color="primary"
                className="bg-green-800 h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
                isDisabled={!nwcUri || submitting}
                isLoading={submitting}
                onPress={handleSubmit}
              >
                {nwcConnectionTranslations("nwcConnection.submitButton")}
              </Button>
              <Button
                variant="bordered"
                isDisabled={submitting}
                onPress={onHide}
                className="h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                {nwcConnectionTranslations("nwcConnection.hideButton")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </WalletGuard>
  );
}
