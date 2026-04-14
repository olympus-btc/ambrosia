"use client";

import { Button, Card, CardBody } from "@heroui/react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

export default function OfflinePage() {
  const t = useTranslations("offlinePage");

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardBody className="flex flex-col items-center justify-center py-12 gap-4">
          <WifiOff className="w-12 h-12 text-green-800" />
          <div className="text-center">
            <p className="text-lg font-semibold text-green-900">{t("title")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("message")}</p>
          </div>
          <Button
            className="bg-green-800 text-white mt-2"
            onPress={() => window.location.reload()}
          >
            {t("retry")}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
