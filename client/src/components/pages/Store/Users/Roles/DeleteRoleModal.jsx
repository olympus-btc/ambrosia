"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { resolveRoleName } from "./utils/roleTemplates";

export function DeleteRoleModal({ role, onClose, onConfirm, deleting }) {
  const t = useTranslations();

  return (
    <Modal
      isOpen={!!role}
      onOpenChange={(open) => { if (!open) onClose(); }}
      placement="center"
      backdrop="blur"
      classNames={{ backdrop: "backdrop-blur-xs bg-white/10" }}
    >
      <ModalContent>
        <ModalHeader>{t("roles.actions.deleteConfirmTitle")}</ModalHeader>
        <ModalBody>
          <p>{t("roles.actions.deleteConfirmBody", { name: resolveRoleName(role?.role ?? "", t) })}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
            onPress={onClose}
            isDisabled={deleting}
          >
            {t("roles.actions.cancel")}
          </Button>
          <Button
            color="danger"
            onPress={onConfirm}
            isLoading={deleting}
          >
            {t("roles.actions.delete")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
