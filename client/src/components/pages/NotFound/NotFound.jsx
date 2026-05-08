"use client";

import Link from "next/link";

import { Button, Card, CardBody } from "@heroui/react";
import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";

export function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
      <Card shadow="none" className="w-full max-w-md bg-white rounded-lg shadow-lg mx-auto my-auto">
        <CardBody className="flex flex-col items-center gap-6 px-8 py-10">
          <div className="w-20 h-20 bg-forest/10 rounded-full flex items-center justify-center mx-auto">
            <SearchX className="w-12 h-12 md:w-14 md:h-14 text-forest/40" />
          </div>

          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest text-forest/50 uppercase">
              {t("errorCode")}
            </p>
            <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
              {t("heading")}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t("description")}
            </p>
          </div>

          <Button
            as={Link}
            href="/"
            color="primary"
            className="bg-green-800"
          >
            {t("goHome")}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
