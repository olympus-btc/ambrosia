"use client";

import { useRef, useState } from "react";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

export function DeleteProjectModal({ isOpen, onClose, onConfirm, project }) {
  const projectTranslations = useTranslations("freelanceProjects");
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const handleConfirmDeleteProject = async () => {
    if (isDeletingRef.current) return;

    isDeletingRef.current = true;
    try {
      setIsDeleting(true);
      await onConfirm();
    } catch {
      return;
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextOpenState) => {
        if (!nextOpenState) onClose();
      }}
      placement="center"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{projectTranslations("modal.titleDelete")}</ModalHeader>
        <ModalBody>
          <p>{projectTranslations("modal.subtitleDelete")}<b> {project?.name}</b>?</p>
          <p className="text-red-500 text-sm">{projectTranslations("modal.warningDelete")}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={onClose}
            isDisabled={isDeleting}
          >
            {projectTranslations("modal.cancelButton")}
          </Button>
          <Button
            color="danger"
            onPress={handleConfirmDeleteProject}
            isDisabled={isDeleting}
            isLoading={isDeleting}
          >
            {projectTranslations("modal.deleteButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
