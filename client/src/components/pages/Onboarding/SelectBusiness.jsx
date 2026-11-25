"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Briefcase, Store, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";

const BUSINESS_TYPE_OPTIONS = [
  { businessType: "store", BusinessTypeIcon: Store, isHiddenInOnboarding: false },
  { businessType: "restaurant", BusinessTypeIcon: UtensilsCrossed, isHiddenInOnboarding: true },
  { businessType: "freelance", BusinessTypeIcon: Briefcase, isHiddenInOnboarding: false },
];

const ONBOARDING_VISIBLE_BUSINESS_TYPE_OPTIONS = BUSINESS_TYPE_OPTIONS.filter(
  (businessTypeOption) => !businessTypeOption.isHiddenInOnboarding,
);

export function BusinessTypeStep({ businessType, onChange }) {
  const businessTypeTranslations = useTranslations();

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{businessTypeTranslations("step1.title")}</h2>
      <p className="text-gray-500 mb-4 md:mb-8">{businessTypeTranslations("step1.subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ONBOARDING_VISIBLE_BUSINESS_TYPE_OPTIONS.map(({ businessType: optionBusinessType, BusinessTypeIcon }) => (
          <Card
            key={optionBusinessType}
            aria-label={optionBusinessType}
            shadow="none"
            isPressable
            onPress={() => onChange(optionBusinessType)}
            className={`border border-gray-200 rounded-lg hover:bg-green-200 py-4 ${businessType === optionBusinessType ? "bg-green-100 border-green-300" : ""}`}
          >
            <CardBody className="flex flex-row items-center gap-3 p-3 md:hidden">
              <BusinessTypeIcon className="w-10 h-10 shrink-0 text-green-800" />
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">{businessTypeTranslations(`step1.businessType.${optionBusinessType}`)}</h3>
                <p className="text-sm text-gray-500">{businessTypeTranslations(`step1.descriptions.${optionBusinessType}`)}</p>
              </div>
            </CardBody>
            <CardHeader className="hidden md:flex">
              <div className="flex flex-col">
                <BusinessTypeIcon className="w-12 h-12 mb-4 text-green-800" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">{businessTypeTranslations(`step1.businessType.${optionBusinessType}`)}</h3>
              </div>
            </CardHeader>
            <CardBody className="hidden md:block">
              <p className="text-sm text-gray-500">{businessTypeTranslations(`step1.descriptions.${optionBusinessType}`)}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
