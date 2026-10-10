"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

export function PhoenixdRemoteActivatedModal({ isOpen, onAcknowledge, phoenixdRemoteCardTranslations }) {
  return (
    <Modal
      isOpen={isOpen}
      isDismissable={false}
      hideCloseButton
      backdrop="blur"
      classNames={{ backdrop: "backdrop-blur-xs bg-white/10" }}
    >
      <ModalContent>
        <ModalHeader>{phoenixdRemoteCardTranslations("phoenixdRemoteCard.remoteActivatedTitle")}</ModalHeader>
        <ModalBody>
          <p>{phoenixdRemoteCardTranslations("phoenixdRemoteCard.remoteActivatedDescription")}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" className="bg-green-800" onPress={onAcknowledge}>
            {phoenixdRemoteCardTranslations("phoenixdRemoteCard.remoteActivatedButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
