"use client";
import { useRouter } from "next/navigation";

import { Card, CardBody, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useAuth } from "@hooks/auth/useAuth";

import { ErrorIcon } from "./ErrorIcon";
import { ErrorMessage } from "./ErrorMessage";

export function Unauthorized() {
  const router = useRouter();
  const t = useTranslations("unauthorized");
  const { logout } = useAuth();

  const handleLogin = async () => {
    await logout();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
      <Card shadow="none" className="w-full max-w-md bg-white rounded-lg shadow-lg mx-auto my-auto">
        <CardBody className="flex flex-col items-center gap-6 px-8 py-10">
          <ErrorIcon />
          <ErrorMessage />

          <div className="flex justify-center gap-3 w-full">
            <Button
              onPress={() => router.push("/")}
              variant="bordered"
              className="border border-border text-foreground hover:bg-muted transition-colors"
            >
              {t("goHome")}
            </Button>

            <Button
              onPress={handleLogin}
              color="primary"
              className="bg-green-800"
            >
              {t("login")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
