"use client";

import { useEffect, useState } from "react";

import { addToast, Button, Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useSystemRestart } from "@/hooks/useSystemRestart";

import { RestartConfirmModal } from "./RestartConfirmModal";

export function SystemCard() {
  const systemCardTranslations = useTranslations("settings");
  const {
    serverRestartSupported,
    phoenixdRestartSupported,
    restartingTarget,
    loadRestartCapabilities,
    restartServer,
    restartPhoenixd,
  } = useSystemRestart();
  const [confirmTarget, setConfirmTarget] = useState(null);

  useEffect(() => {
    loadRestartCapabilities();
  }, [loadRestartCapabilities]);

  const restartTargets = {
    server: {
      buttonLabelKey: "cardSystem.restartServerButton",
      confirmTitleKey: "cardSystem.confirmServerTitle",
      confirmDescriptionKey: "cardSystem.confirmServerDescription",
      successMessageKey: "cardSystem.restartServerSuccess",
      errorMessageKey: "cardSystem.restartServerError",
      isSupported: serverRestartSupported,
      restart: restartServer,
    },
    phoenixd: {
      buttonLabelKey: "cardSystem.restartPhoenixdButton",
      confirmTitleKey: "cardSystem.confirmPhoenixdTitle",
      confirmDescriptionKey: "cardSystem.confirmPhoenixdDescription",
      successMessageKey: "cardSystem.restartPhoenixdSuccess",
      errorMessageKey: "cardSystem.restartPhoenixdError",
      isSupported: phoenixdRestartSupported,
      restart: restartPhoenixd,
    },
  };

  const activeConfirmTarget = confirmTarget ? restartTargets[confirmTarget] : null;
  const supportedTargetEntries = Object.entries(restartTargets).filter(([, target]) => target.isSupported);

  const handleConfirmRestart = async () => {
    const succeeded = await activeConfirmTarget.restart();
    const resultMessageKey = succeeded ? activeConfirmTarget.successMessageKey : activeConfirmTarget.errorMessageKey;
    setConfirmTarget(null);
    addToast({ color: succeeded ? "success" : "danger", description: systemCardTranslations(resultMessageKey) });
  };

  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {systemCardTranslations("cardSystem.title")}
        </h2>
      </CardHeader>

      <CardBody className="gap-4">
        <p className="text-sm text-gray-500">{systemCardTranslations("cardSystem.description")}</p>

        {supportedTargetEntries.length === 0 ? (
          <p className="text-sm text-gray-500">{systemCardTranslations("cardSystem.unsupportedNotice")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {supportedTargetEntries.map(([targetName, target]) => (
              <Button
                key={targetName}
                color="danger"
                onPress={() => setConfirmTarget(targetName)}
                isLoading={restartingTarget === targetName}
              >
                {systemCardTranslations(target.buttonLabelKey)}
              </Button>
            ))}
          </div>
        )}
      </CardBody>

      {activeConfirmTarget && (
        <RestartConfirmModal
          isOpen
          isRestarting={restartingTarget !== null}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={handleConfirmRestart}
          systemCardTranslations={systemCardTranslations}
          title={systemCardTranslations(activeConfirmTarget.confirmTitleKey)}
          description={systemCardTranslations(activeConfirmTarget.confirmDescriptionKey)}
        />
      )}
    </Card>
  );
}
