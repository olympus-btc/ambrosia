"use client";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { Download, Share, EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";

import { useInstallPrompt, useIsAndroid, useIsIOS, useIsStandalone } from "@hooks/usePWA";

function InstructionStep({ number, icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-800 text-white text-xs font-semibold shrink-0">
        {number}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {Icon && <Icon className="w-4 h-4 text-green-800 shrink-0" />}
        <span>{text}</span>
      </div>
    </div>
  );
}

export function InstallPWA() {
  const t = useTranslations("settings");
  const isStandalone = useIsStandalone();
  const isIOS = useIsIOS();
  const isAndroid = useIsAndroid();
  const { isInstallable, promptInstall } = useInstallPrompt();

  if (isStandalone || (!isInstallable && !isIOS && !isAndroid)) return null;

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-2">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {t("cardInstall.title")}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{t("cardInstall.subtitle")}</p>
      </CardHeader>
      <CardBody className="pt-2">
        {isInstallable ? (
          <Button
            className="bg-green-800 text-white"
            startContent={<Download className="w-4 h-4" />}
            onPress={promptInstall}
          >
            {t("cardInstall.button")}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <InstructionStep
              number={1}
              icon={isIOS ? Share : EllipsisVertical}
              text={isIOS ? t("cardInstall.iosStep1") : t("cardInstall.androidStep1")}
            />
            <InstructionStep
              number={2}
              text={isIOS ? t("cardInstall.iosStep2") : t("cardInstall.androidStep2")}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
