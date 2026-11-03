"use client";

import { useEffect, useState } from "react";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { isElectron } from "@lib/isElectron";

const RESTART_COUNTDOWN_SECONDS = 5;

export function RestartRequiredModal({ isOpen, onManualClose, onRestart }) {
  const restartModalTranslations = useTranslations("restartRequiredModal");
  const acknowledge = isElectron ? onRestart : onManualClose;
  const countdownSeconds = isElectron ? RESTART_COUNTDOWN_SECONDS : undefined;
  const isCountingDown = countdownSeconds != null;
  const [secondsRemaining, setSecondsRemaining] = useState(countdownSeconds);

  useEffect(() => {
    if (!isCountingDown || !isOpen) return undefined;
    if (secondsRemaining <= 0) {
      acknowledge();
      return undefined;
    }
    const countdownTimer = setTimeout(() => setSecondsRemaining((current) => current - 1), 1000);
    return () => clearTimeout(countdownTimer);
  }, [isCountingDown, isOpen, secondsRemaining, acknowledge]);

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
          <p>{restartModalTranslations(isCountingDown ? "countdownDescription" : "description")}</p>
          {isCountingDown && (
            <p className="text-3xl font-bold text-center text-green-900">{secondsRemaining}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" className="bg-green-800" onPress={acknowledge}>
            {restartModalTranslations(isCountingDown ? "restartNowButton" : "acknowledgeButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
