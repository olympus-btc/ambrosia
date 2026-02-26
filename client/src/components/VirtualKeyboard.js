"use client";
import { useState, useEffect, useCallback } from "react";

import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { Delete, Check, X } from "lucide-react";

const VirtualKeyboard = ({ isOpen, value, onChange, onClose }) => {
  const [currentText, setCurrentText] = useState(value || "");
  const keys = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
    ["Z", "X", "C", "V", "B", "N", "M", ",", "."],
  ];

  const handleKeyPress = (key) => {
    if (key === "SPACE") {
      setCurrentText(`${currentText} `);
    } else if (key === "BACKSPACE") {
      setCurrentText(currentText.slice(0, -1));
    } else {
      setCurrentText(currentText + key.toLowerCase());
    }
  };

  const handleAccept = useCallback(() => {
    onChange(currentText);
    onClose(currentText); // Pasar el texto final al cerrar
  }, [currentText, onChange, onClose]);

  const handleCancel = useCallback(() => {
    setCurrentText(value || "");
    onClose();
  }, [value, onClose]);

  // Manejar teclado físico
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      // Prevenir el comportamiento por defecto para ciertas teclas
      if (["Enter", "Escape", "Backspace"].includes(event.key)) {
        event.preventDefault();
      }

      switch (event.key) {
        case "Enter":
          handleAccept();
          break;
        case "Escape":
          handleCancel();
          break;
        case "Backspace":
          setCurrentText(currentText.slice(0, -1));
          break;
        case " ":
          event.preventDefault();
          setCurrentText(`${currentText} `);
          break;
        default:
          // Solo permitir letras, números y algunos signos de puntuación
          if (event.key.length === 1 && /[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ\s.,!¡?¿-]/.test(event.key)) {
            setCurrentText(currentText + event.key.toLowerCase());
          }
          break;
      }
    };

    // Agregar el event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup al desmontar o cerrar
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, currentText, handleAccept, handleCancel]);

  const commonPhrases = [
    "sin cebolla",
    "extra picante",
    "sin sal",
    "poco cocido",
    "bien cocido",
    "sin chile",
    "extra queso",
    "sin tomate",
    "término medio",
    "para llevar",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      size="3xl"
      placement="center"
      backdrop="blur"
      classNames={{
        modal: "max-h-[85vh] mx-4",
        body: "p-4",
        header: "pb-2",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="text-center w-full">
            <h3 className="text-lg font-semibold">
              ✍️ Agregar Notas al Platillo
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Puedes usar el teclado físico • Enter=Aceptar • Esc=Cancelar
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          {/* Pantalla de texto */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Escribiendo:</div>
            <div className="min-h-12 p-2 bg-white rounded border text-base">
              {currentText || (
              <span className="text-gray-400 italic">
                Escribe tu nota aquí...
              </span>
              )}
              <span className="animate-pulse">|</span>
            </div>
          </div>

          {/* Botones de acción principales */}
          <div className="flex gap-3 mb-4">
            <Button
              color="success"
              size="lg"
              className="flex-1 h-14 font-bold"
              onPress={handleAccept}
              startContent={<Check className="w-5 h-5" />}
            >
              Aceptar
            </Button>
            <Button
              color="danger"
              variant="ghost"
              size="lg"
              className="flex-1 h-14 font-bold"
              onPress={handleCancel}
              startContent={<X className="w-5 h-5" />}
            >
              Cancelar
            </Button>
          </div>

          {/* Frases comunes */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Frases comunes:</p>
            <div className="grid grid-cols-2 gap-2">
              {commonPhrases.map((phrase) => (
                <Button
                  key={phrase}
                  size="md"
                  variant="ghost"
                  className="text-sm h-12"
                  onPress={() => setCurrentText(
                    currentText + (currentText ? ", " : "") + phrase,
                  )
                }
                >
                  {phrase}
                </Button>
              ))}
            </div>
          </div>

          {/* Teclado */}
          <div className="space-y-3">
            {keys.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2">
                {row.map((key) => (
                  <Button
                    key={key}
                    size="md"
                    variant="ghost"
                    className="min-w-12 h-14 text-lg font-medium"
                    onPress={() => handleKeyPress(key)}
                  >
                    {key}
                  </Button>
                ))}
              </div>
            ))}

            {/* Fila de funciones */}
            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                variant="ghost"
                className="flex-1 h-14"
                onPress={() => handleKeyPress("SPACE")}
              >
                Espacio
              </Button>
              <Button
                size="lg"
                variant="ghost"
                color="danger"
                className="h-14"
                onPress={() => handleKeyPress("BACKSPACE")}
                startContent={<Delete className="w-5 h-5" />}
              >
                Borrar
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default VirtualKeyboard;
