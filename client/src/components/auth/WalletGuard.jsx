"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  Form,
} from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTour } from "@/hooks/tour/useTour";
import {
  loginWallet,
  logoutWallet,
} from "@/services/walletService";

const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";

export default function WalletGuard({
  children,
  placeholder = null,
  title = "Confirmar acceso a Wallet",
  passwordLabel = "Contraseña",
  confirmText = "Entrar",
  cancelText = "Cancelar",
  onAuthorized,
  onCancel,
}) {
  const router = useRouter();
  const walletTourTranslations = useTranslations("walletTour");
  const [isOpen, setIsOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => () => {
    logoutWallet().catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => {
      setAuthorized(false);
      setIsOpen(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("wallet:unauthorized", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("wallet:unauthorized", handler);
      }
    };
  }, []);

  useTour({
    key: WALLET_GUARD_TOUR_KEY,
    condition: isOpen,
    delay: 300,
    driverOptions: {
      allowClose: true,
      overlayOpacity: 0,
      steps: [
        {
          element: "#wallet-guard-anchor",
          popover: {
            title: walletTourTranslations("guardTitle"),
            description: walletTourTranslations("guardDescription"),
            side: "top",
            align: "center",
            nextBtnText: walletTourTranslations("guardButton"),
            showButtons: ["next"],
          },
        },
      ],
    },
    onBeforeStart: () => {
      const updateAnchorPosition = () => {
        const formEl = document.getElementById("wallet-guard-form");
        const dialogEl = formEl?.closest('[role="dialog"]') ?? document.querySelector('[role="dialog"]');
        const anchor = document.getElementById("wallet-guard-anchor");
        if (dialogEl && anchor) {
          const rect = dialogEl.getBoundingClientRect();
          anchor.style.top = `${rect.top}px`;
          anchor.style.left = `${rect.left + rect.width / 2}px`;
          anchor.style.transform = "translateX(-50%)";
        }
      };
      updateAnchorPosition();
      window.addEventListener("resize", updateAnchorPosition);
      return () => window.removeEventListener("resize", updateAnchorPosition);
    },
  });

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setPasswordError("");
    try {
      await loginWallet(password);
      await new Promise((resolveLoginDelay) => setTimeout(resolveLoginDelay, 150));
      setAuthorized(true);
      setIsOpen(false);
      if (onAuthorized) onAuthorized();
    } catch {
      setPasswordError(walletTourTranslations("guardLoginError"));
    } finally {
      setSubmitting(false);
      setPassword("");
    }
  };

  return (
    <>
      <div id="wallet-guard-anchor" className="pointer-events-none fixed h-px w-px opacity-0" />
      <Modal
        isOpen={isOpen}
        isDismissable={false}
        hideCloseButton
        backdrop="blur"
        shouldBlockScroll={false}
        classNames={{
          backdrop: "backdrop-blur-xs bg-white/10",
          wrapper: "items-start h-auto",
          base: "my-auto overflow-hidden",
        }}
      >
        <ModalContent className="rounded-lg">
          <ModalHeader>{title}</ModalHeader>
          <ModalBody>
            <Form onSubmit={handleSubmit} id="wallet-guard-form">
              <div id="wallet-guard-password" className="w-full">
                <Input
                  label={passwordLabel}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(changeEvent) => {
                    setPassword(changeEvent.target.value);
                    setPasswordError("");
                  }}
                  isDisabled={submitting}
                  isInvalid={Boolean(passwordError)}
                  errorMessage={passwordError}
                  endContent={(
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                )}
                  autoFocus
                />
              </div>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              type="button"
              className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onPress={() => (onCancel ? onCancel() : router.push("/store"))}
            >
              {cancelText}
            </Button>
            <Button
              color="primary"
              type="submit"
              form="wallet-guard-form"
              isDisabled={!password || submitting}
              isLoading={submitting}
            >
              {confirmText}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {authorized ? children : placeholder}
    </>
  );
}
