"use client";

import { useEffect, useState } from "react";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { isElectron } from "@lib/isElectron";

const RESTART_COUNTDOWN_SECONDS = 5;

const RESTART_PHASE_CONTENT = {
  counting: { descriptionKey: "countdownDescription", buttonLabelKey: "restartNowButton" },
  restarting: { descriptionKey: "restartingDescription", buttonLabelKey: "restartingButton" },
  ready: { descriptionKey: "readyDescription", buttonLabelKey: "reloadButton" },
};

function getRestartPhase(hasRestarted, secondsRemaining) {
  if (hasRestarted) return "ready";
  if (secondsRemaining > 0) return "counting";
  return "restarting";
}

export function RestartRequiredModal({ isOpen, onManualClose, onRestart, includesPhoenixdData = false }) {
  const restartModalTranslations = useTranslations("restartRequiredModal");
  const [secondsRemaining, setSecondsRemaining] = useState(RESTART_COUNTDOWN_SECONDS);
  const [hasRestarted, setHasRestarted] = useState(false);
  const restartPhase = isElectron ? getRestartPhase(hasRestarted, secondsRemaining) : null;
  const showPhoenixdSteps = !isElectron && includesPhoenixdData;
  const phoenixdSteps = showPhoenixdSteps ? restartModalTranslations.raw("phoenixdSteps") : [];
  const phoenixdHighlights = showPhoenixdSteps ? restartModalTranslations.raw("phoenixdHighlights") : [];

  useEffect(() => {
    if (!isElectron || !isOpen || hasRestarted || secondsRemaining > 0) return undefined;
    onRestart().then(() => setHasRestarted(true));
    return undefined;
  }, [isOpen, hasRestarted, secondsRemaining, onRestart]);

  useEffect(() => {
    if (!isElectron || !isOpen || hasRestarted || secondsRemaining <= 0) return undefined;
    const countdownTimer = setTimeout(() => setSecondsRemaining((current) => current - 1), 1000);
    return () => clearTimeout(countdownTimer);
  }, [isOpen, hasRestarted, secondsRemaining]);

  function handleButtonPress() {
    if (!isElectron) {
      onManualClose();
      return;
    }
    if (hasRestarted) {
      window.location.reload();
      return;
    }
    setSecondsRemaining(0);
  }

  const { descriptionKey, buttonLabelKey } = isElectron
    ? RESTART_PHASE_CONTENT[restartPhase]
    : { descriptionKey: "description", buttonLabelKey: "acknowledgeButton" };

  return (
    <Modal
      isOpen={isOpen}
      isDismissable={false}
      hideCloseButton
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{restartModalTranslations("title")}</ModalHeader>
        <ModalBody>
          {showPhoenixdSteps ? (
            <ol className="list-decimal list-inside space-y-1">
              {phoenixdSteps.map(([beforeHighlight, afterHighlight], stepIndex) => (
                <li key={stepIndex}>
                  {beforeHighlight}
                  <span className="font-semibold">{phoenixdHighlights[stepIndex]}</span>
                  {afterHighlight}
                </li>
              ))}
            </ol>
          ) : (
            <p>{restartModalTranslations(descriptionKey)}</p>
          )}
          {isElectron && restartPhase === "counting" && (
            <p className="text-3xl font-bold text-center text-green-900">{secondsRemaining}</p>
          )}
          {isElectron && restartPhase === "restarting" && (
            <div className="flex justify-center">
              <Spinner size="lg" color="success" />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            className="bg-green-800"
            isDisabled={isElectron && restartPhase === "restarting"}
            onPress={handleButtonPress}
          >
            {restartModalTranslations(buttonLabelKey)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
