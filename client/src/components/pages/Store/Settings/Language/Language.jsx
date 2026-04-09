"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@i18n/I18nProvider";

export function Language() {
  const t = useTranslations("settings");

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {t("cardLanguage.title")}
        </h2>
      </CardHeader>
      <CardBody>
        <div className="w-fit">
          <LanguageSwitcher />
        </div>
      </CardBody>
    </Card>
  );
}
