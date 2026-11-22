"use client";

import { useRef, useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

export function DeleteUsersModal({ user, deleteUsersShowModal, setDeleteUsersShowModal, currentUserPin, setCurrentUserPin, onConfirm }) {
  const userTranslations = useTranslations("users");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCurrentUserPin, setShowCurrentUserPin] = useState(false);
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
          <Input
            label={userTranslations("modal.currentUserPinLabel")}
            type={showCurrentUserPin ? "text" : "password"}
            placeholder={userTranslations("modal.currentUserPinPlaceholder")}
            isRequired
            minLength={4}
            maxLength={6}
            errorMessage={userTranslations("modal.currentUserPinError")}
            value={currentUserPin ?? ""}
            onChange={(event) => {
              const onlyNumbers = event.target.value.replace(/\D/g, "");
              setCurrentUserPin(onlyNumbers);
            }}
            endContent={
              (
                <button
                  type="button"
                  aria-label={showCurrentUserPin ? "Hide your PIN" : "Show your PIN"}
                  onClick={() => setShowCurrentUserPin(!showCurrentUserPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentUserPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )
            }
          />
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
            isDisabled={isDeleting || !currentUserPin}
            isLoading={isDeleting}
          >
            {userTranslations("modal.deleteButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
