"use client";

import { useState } from "react";

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { resolveRoleName } from "./utils/roleTemplates";

export function DeleteRoleModal({ role, onClose, onConfirm, deleting, currentUserPin, setCurrentUserPin }) {
  const roleTranslations = useTranslations();
  const [showCurrentUserPin, setShowCurrentUserPin] = useState(false);

  return (
    <Modal
      isOpen={!!role}
      onOpenChange={(open) => { if (!open) onClose(); }}
      placement="center"
      backdrop="blur"
      classNames={{ backdrop: "backdrop-blur-xs bg-white/10" }}
    >
      <ModalContent>
        <ModalHeader>{roleTranslations("roles.actions.deleteConfirmTitle")}</ModalHeader>
        <ModalBody>
          <p>{roleTranslations("roles.actions.deleteConfirmBody", { name: resolveRoleName(role?.role ?? "", roleTranslations) })}</p>
          <Input
            label={roleTranslations("roles.actions.deleteConfirmCurrentUserPinLabel")}
            type={showCurrentUserPin ? "text" : "password"}
            placeholder={roleTranslations("roles.actions.deleteConfirmCurrentUserPinPlaceholder")}
            isRequired
            minLength={4}
            maxLength={6}
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
            className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
            onPress={onClose}
            isDisabled={deleting}
          >
            {roleTranslations("roles.actions.cancel")}
          </Button>
          <Button
            color="danger"
            onPress={onConfirm}
            isDisabled={deleting || !currentUserPin}
            isLoading={deleting}
          >
            {roleTranslations("roles.actions.delete")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
