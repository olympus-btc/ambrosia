"use client";

import { Card, CardHeader, CardBody } from "@heroui/card";
import { Store, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";

export function BusinessTypeStep({ value, onChange }) {
  const t = useTranslations();

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-2">{t("step1.title")}</h2>
      <p className="text-muted-foreground mb-8">{t("step1.subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          aria-label="store"
          isPressable
          onPress={() => onChange("store")}
          className={`hover:bg-green-200 py-4 ${
            value === "store" ? "bg-green-100" : ""
          }`}
        >
          <CardHeader>
            <div className="flex flex-col">
              <Store className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t("step1.businessType.store")}</h3>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              {t("step1.descriptions.store")}
            </p>
          </CardBody>
        </Card>

        <Card
          aria-label="restaurant"
          isPressable
          onPress={() => onChange("store")}
          className={`hover:bg-green-200 py-4 ${
            value === "restaurant" ? "bg-green-100" : ""
          }`}
        >
          <CardHeader>
            <div className="flex flex-col">
              <UtensilsCrossed className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t("step1.businessType.restaurant")}</h3>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              {t("step1.descriptions.restaurant")}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
