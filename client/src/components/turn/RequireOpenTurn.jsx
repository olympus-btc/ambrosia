"use client";

import { useEffect, useRef } from "react";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useTurn } from "@/hooks/turn/useTurn";

import OpenTurnForm from "../turn/OpenTurnForm";

export default function RequireOpenTurn({ children }) {
  const { openTurn, loading, checkOpenShift } = useTurn();
  const checkedRef = useRef(false);

  const showModal = !loading && !openTurn;

  const t = useTranslations("shifts");

  useEffect(() => {
    if (!showModal) {
      checkedRef.current = false;
      return;
    }
    if (checkedRef.current) return;
    checkedRef.current = true;

    checkOpenShift().catch(() => {});
  }, [showModal, checkOpenShift]);

  return (
    <>
      {children}
      <Modal
        isOpen={showModal}
        hideCloseButton
        isDismissable={false}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2 text-center">
            {t("requiredOpenShiftTitle")}
            <p className="text-base font-normal text-gray-600">
              {t("requiredOpenShiftMessage")}
            </p>
          </ModalHeader>
          <ModalBody className="pb-8">
            <OpenTurnForm />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
