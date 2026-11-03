"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

export function DeleteTimeEntryModal({ timeEntry, isOpen, onClose, onConfirm }) {
  const timesheetTranslations = useTranslations("timesheet");
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => !nextIsOpen && onClose()}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
      placement="center"
    >
      <ModalContent>
        <ModalHeader>{timesheetTranslations("modal.titleDelete")}</ModalHeader>
        <ModalBody>
          <p>{timesheetTranslations("modal.subtitleDelete")}<b> {timeEntry?.projectName} · {timeEntry?.taskName}</b>?</p>
          <p className="text-red-500 text-sm">{timesheetTranslations("modal.warningDelete")}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={onClose}
          >
            {timesheetTranslations("modal.cancelButton")}
          </Button>
          <Button color="danger" onPress={onConfirm}>
            {timesheetTranslations("modal.deleteButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
