"use client";

import { Card, CardBody, CardHeader, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useDisplaySettings } from "@/providers/display/DisplayProvider";

export function Display() {
  const displayTranslations = useTranslations("settings");
  const { disableAnimation, setDisableAnimation } = useDisplaySettings();

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {displayTranslations("cardDisplay.title")}
        </h2>
        <p className="text-sm text-gray-500">{displayTranslations("cardDisplay.subtitle")}</p>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-1">
          <Switch isSelected={disableAnimation} onValueChange={setDisableAnimation}>
            <span className="text-sm font-medium">{displayTranslations("cardDisplay.disableAnimations")}</span>
          </Switch>
          <p className="text-xs text-gray-500 pl-12">{displayTranslations("cardDisplay.disableAnimationsHint")}</p>
        </div>
      </CardBody>
    </Card>
  );
}
