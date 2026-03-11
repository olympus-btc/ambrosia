"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const tTour = useTranslations("walletTour");
  const [isOpen, setIsOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const expiryKey = "walletAccessExpiry";
  const expiryTimeoutRef = useRef(null);
  const fallbackExpiryMs = 8 * 60 * 60 * 1000;
  const expiryBufferMs = 30 * 1000;

  const scheduleExpiry = useCallback((expiresAtMs) => {
    try {
      localStorage.setItem(expiryKey, String(expiresAtMs));
      if (expiryTimeoutRef.current) clearTimeout(expiryTimeoutRef.current);
      const msRemaining = Math.max(0, expiresAtMs - Date.now() - expiryBufferMs);
      expiryTimeoutRef.current = setTimeout(() => {
        setAuthorized(false);
        setIsOpen(true);
      }, msRemaining);
    } catch {}
  }, [expiryBufferMs, expiryKey]);

  useEffect(() => () => {
    logoutWallet().catch(() => {});
    try {
      localStorage.removeItem(expiryKey);
    } catch {}
    if (expiryTimeoutRef.current) {
      clearTimeout(expiryTimeoutRef.current);
      expiryTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    try {
      const storedExpiry = Number(localStorage.getItem(expiryKey));
      const now = Date.now();
      if (Number.isFinite(storedExpiry) && storedExpiry - now > 0) {
        setAuthorized(true);
        setIsOpen(false);
        scheduleExpiry(storedExpiry);
      }
    } catch {}
  }, [scheduleExpiry]);

  useEffect(() => {
    const handler = () => {
      setAuthorized(false);
      setIsOpen(true);
      try {
        localStorage.removeItem(expiryKey);
      } catch {}
      if (expiryTimeoutRef.current) {
        clearTimeout(expiryTimeoutRef.current);
        expiryTimeoutRef.current = null;
      }
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
            title: tTour("guardTitle"),
            description: tTour("guardDescription"),
            side: "top",
            align: "center",
            nextBtnText: tTour("guardButton"),
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    try {
      const result = await loginWallet(password);
      await new Promise((r) => setTimeout(r, 150));
      setAuthorized(true);
      setIsOpen(false);
      const expiresAt =
        typeof result?.walletTokenExpiresAt === "number"
          ? result.walletTokenExpiresAt
          : Date.now() + fallbackExpiryMs;
      scheduleExpiry(expiresAt);
      if (onAuthorized) onAuthorized();
    } catch {}
    finally {
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
        classNames={{
          backdrop: "backdrop-blur-xs bg-white/10",
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
                  onChange={(e) => setPassword(e.target.value)}
                  isDisabled={submitting}
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
              onPress={() => (onCancel ? onCancel() : router.back())}
            >
              {cancelText}
            </Button>
            <Button
              color="primary"
              type="submit"
              form="wallet-guard-form"
              isDisabled={!password}
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
