"use client";
import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTurn } from "../../modules/cashier/useTurn";
import OpenTurnForm from "../cashier/OpenTurnForm";

export default function RequireOpenTurn({ children }) {
  const { openTurn, loading } = useTurn();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loading && !openTurn) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [loading, openTurn]);

  const handleOpened = () => setShowModal(false);

  return (
    <>
      {children}
      <Modal
        isOpen={showModal}
        onOpenChange={setShowModal}
        hideCloseButton
        isDismissable={false}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2 text-center">
            <span className="text-2xl font-bold">Abrir turno requerido</span>
            <p className="text-base font-normal text-gray-600">
              Para continuar, abre un turno registrando el efectivo inicial en caja.
            </p>
          </ModalHeader>
          <ModalBody className="pb-8">
            <OpenTurnForm onOpened={handleOpened} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
