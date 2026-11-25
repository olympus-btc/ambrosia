"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export function PinDeprecationModal({ isOpen, onGoToUsers, onLater }) {
  const pinLoginTranslations = useTranslations("pinLogin");

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onLater();
      }}
      placement="center"
      backdrop="blur"
      shouldBlockScroll={false}
      aria-label={pinLoginTranslations("pinDeprecation.title")}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
        body: "overflow-y-auto max-h-[65vh]",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-warning" aria-hidden="true" />
          {pinLoginTranslations("pinDeprecation.title")}
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-foreground">{pinLoginTranslations("pinDeprecation.body")}</p>
          <p className="text-xs text-muted-foreground">{pinLoginTranslations("pinDeprecation.adminNote")}</p>
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button
            variant="bordered"
            aria-label={pinLoginTranslations("pinDeprecation.laterButton")}
            className="border border-border text-foreground hover:bg-muted transition-colors"
            onPress={onLater}
          >
            {pinLoginTranslations("pinDeprecation.laterButton")}
          </Button>
          <Button
            color="primary"
            aria-label={pinLoginTranslations("pinDeprecation.goToUsersButton")}
            onPress={onGoToUsers}
          >
            {pinLoginTranslations("pinDeprecation.goToUsersButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
