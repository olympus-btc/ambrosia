"use client";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useTurn } from "../../modules/cashier/useTurn";
import OpenTurnForm from "../cashier/OpenTurnForm";

export default function RequireOpenTurn({ children }) {
  const { openTurn, loading } = useTurn();

  const showModal = !loading && !openTurn;

  const t = useTranslations("shifts");

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
