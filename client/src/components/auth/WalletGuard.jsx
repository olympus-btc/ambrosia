"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { AuthContext } from "../../modules/auth/AuthProvider";
import {
  loginWallet,
  logoutWallet,
} from "../../modules/cashier/cashierService";

export default function WalletGuard({
  children,
  placeholder = null,
  title = "Confirmar acceso a Wallet",
  passwordLabel = "Contraseña",
  confirmText = "Entrar",
  cancelText = "Cancelar",
  onAuthorized,
}) {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const expiryKey = "walletAccessExpiry";
  const expiryTimeoutRef = useRef(null);
  const fallbackExpiryMs = 8 * 60 * 60 * 1000; // 8h
  const expiryBufferMs = 30 * 1000; // small buffer to re-auth before server expiry

  useEffect(() => {
    return () => {
      // Ensure wallet token is cleared when leaving the page
      logoutWallet().catch(() => {});
      try {
        localStorage.removeItem(expiryKey);
      } catch (_) {}
      if (expiryTimeoutRef.current) {
        clearTimeout(expiryTimeoutRef.current);
        expiryTimeoutRef.current = null;
      }
    };
  }, []);

  // Restore wallet session if cookie/localStorage still valid
  useEffect(() => {
    try {
      const storedExpiry = Number(localStorage.getItem(expiryKey));
      const now = Date.now();
      if (Number.isFinite(storedExpiry) && storedExpiry - now > 0) {
        setAuthorized(true);
        setIsOpen(false);
        scheduleExpiry(storedExpiry);
      }
    } catch (_) {}
  }, []);

  // React to unauthorized wallet API responses
  useEffect(() => {
    const handler = () => {
      setAuthorized(false);
      setIsOpen(true);
      try {
        localStorage.removeItem(expiryKey);
      } catch (_) {}
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

  // Do not proactively call wallet endpoints here; children handle their own data fetching
  const scheduleExpiry = (expiresAtMs) => {
    try {
      localStorage.setItem(expiryKey, String(expiresAtMs));
      if (expiryTimeoutRef.current) clearTimeout(expiryTimeoutRef.current);
      const msRemaining = Math.max(0, expiresAtMs - Date.now() - expiryBufferMs);
      expiryTimeoutRef.current = setTimeout(() => {
        setAuthorized(false);
        setIsOpen(true);
      }, msRemaining);
    } catch (_) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    try {
      const result = await loginWallet(password);
      // Allow Set-Cookie to persist before enabling children
      await new Promise((r) => setTimeout(r, 150));
      setAuthorized(true);
      setIsOpen(false);
      // Track client-side expiry using server-provided timestamp or fallback
      const expiresAt =
        typeof result?.walletTokenExpiresAt === "number"
          ? result.walletTokenExpiresAt
          : Date.now() + fallbackExpiryMs;
      scheduleExpiry(expiresAt);
      if (onAuthorized) onAuthorized();
    } catch (_) {
      // apiClient already shows a toast on error
    } finally {
      setSubmitting(false);
      setPassword("");
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        isDismissable={false}
        hideCloseButton
        backdrop="blur"
      >
        <ModalContent className="rounded-lg">
          <ModalHeader>{title}</ModalHeader>
          <ModalBody>
            <Form onSubmit={handleSubmit} id="wallet-guard-form">
              <Input
                label={passwordLabel}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isDisabled={submitting}
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                autoFocus
              />
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              type="button"
              className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onPress={() => setIsOpen(false)}
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
