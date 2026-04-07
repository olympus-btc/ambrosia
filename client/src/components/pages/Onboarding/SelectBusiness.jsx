"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Store, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";

export function BusinessTypeStep({ value, onChange }) {
  const t = useTranslations();

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{t("step1.title")}</h2>
      <p className="text-gray-500 mb-4 md:mb-8">{t("step1.subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          aria-label="store"
          shadow="none"
          isPressable
          onPress={() => onChange("store")}
          className={`border border-gray-200 rounded-lg hover:bg-green-200 py-4 ${value === "store" ? "bg-green-100 border-green-300" : ""}`}
        >
          <CardBody className="flex flex-row items-center gap-3 p-3 md:hidden">
            <Store className="w-10 h-10 shrink-0 text-green-800" />
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">{t("step1.businessType.store")}</h3>
              <p className="text-sm text-gray-500">{t("step1.descriptions.store")}</p>
            </div>
          </CardBody>
          <CardHeader className="hidden md:flex">
            <div className="flex flex-col">
              <Store className="w-12 h-12 mb-4 text-green-800" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">{t("step1.businessType.store")}</h3>
            </div>
          </CardHeader>
          <CardBody className="hidden md:block">
            <p className="text-sm text-gray-500">{t("step1.descriptions.store")}</p>
          </CardBody>
        </Card>

        <Card
          aria-label="restaurant"
          shadow="none"
          isDisabled
          className={`border border-gray-200 rounded-lg hover:bg-gray-200 py-4 ${value === "restaurant" ? "bg-green-100 border-green-300" : ""}`}
        >
          <CardBody className="flex flex-row items-center gap-3 p-3 md:hidden">
            <UtensilsCrossed className="w-10 h-10 shrink-0 text-green-800" />
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">{t("step1.businessType.restaurant")}</h3>
              <p className="text-sm text-gray-500">{t("step1.descriptions.restaurant")}</p>
            </div>
          </CardBody>
          <CardHeader className="hidden md:flex">
            <div className="flex flex-col">
              <UtensilsCrossed className="w-12 h-12 mb-4 text-green-800" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">{t("step1.businessType.restaurant")}</h3>
            </div>
          </CardHeader>
          <CardBody className="hidden md:block">
            <p className="text-sm text-gray-500">{t("step1.descriptions.restaurant")}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
