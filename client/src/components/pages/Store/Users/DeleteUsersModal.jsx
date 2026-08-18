"use client";

import { useRef, useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

export function DeleteUsersModal({ user, deleteUsersShowModal, setDeleteUsersShowModal, onConfirm }) {
  const userTranslations = useTranslations("users");
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const handleConfirmDeleteUser = async () => {
    if (isDeletingRef.current) {
      return;
    }

    isDeletingRef.current = true;
    setIsDeleting(true);

    try {
      await onConfirm?.();
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={deleteUsersShowModal}
      onOpenChange={setDeleteUsersShowModal}
      placement="center"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{userTranslations("modal.titleDelete")}</ModalHeader>
        <ModalBody>
          <p>{userTranslations("modal.subtitleDelete")}<b> {user?.name}</b>?</p>
          <p className="text-red-500 text-sm">{userTranslations("modal.warningDelete")}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={() => setDeleteUsersShowModal(false)}
          >
            {userTranslations("modal.cancelButton")}
          </Button>
          <Button
            color="danger"
            onPress={handleConfirmDeleteUser}
            isDisabled={isDeleting}
            isLoading={isDeleting}
          >
            {userTranslations("modal.deleteButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
