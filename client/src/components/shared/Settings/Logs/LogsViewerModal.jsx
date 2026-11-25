"use client";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { LogsViewerContent } from "./LogsViewerContent";

export function LogsViewerModal({ isOpen, onClose }) {
  const logsTranslations = useTranslations("settings");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {logsTranslations("cardLogs.viewerModalTitle")}
          <span className="text-sm font-normal text-gray-600">{logsTranslations("cardLogs.viewerModalSubtitle")}</span>
        </ModalHeader>
        <ModalBody className="gap-4 pb-6">
          <LogsViewerContent />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
