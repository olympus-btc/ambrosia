"use client";
import { useRouter } from "next/navigation";

import { Card, CardBody, Button } from "@heroui/react";
import { ArrowLeft, LogIn } from "lucide-react";
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
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white mx-auto my-auto">
        <CardBody className="flex flex-col items-center gap-6 px-8 py-10">
          <ErrorIcon />
          <ErrorMessage />

          <div className="flex gap-3 w-full">
            <Button
              onPress={() => router.push("/")}
              size="md"
              variant="bordered"
              className="flex-1 h-12 font-semibold border-2 border-forest text-forest active:scale-95 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t("goHome")}
            </Button>

            <Button
              onPress={handleLogin}
              size="md"
              className="flex-1 h-12 font-semibold gradient-forest text-white shadow-md active:scale-95 transition-all duration-200 border-0"
            >
              <LogIn className="w-4 h-4 mr-1" />
              {t("login")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
