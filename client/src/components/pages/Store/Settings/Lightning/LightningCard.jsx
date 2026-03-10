"use client";

import { addToast, Card, CardBody, CardHeader, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useAutoLiquidity } from "@/hooks/useAutoLiquidity";

export function LightningCard() {
  const t = useTranslations("lightning");
  const { enabled, loading, restarting, toggle } = useAutoLiquidity();

  const handleToggle = async (newEnabled) => {
    const result = await toggle(newEnabled);
    if (result === "manual") {
      addToast({ color: "warning", description: t("manualRestartRequired") });
    } else if (result) {
      addToast({ color: "success", description: t("restartSuccess") });
    } else {
      addToast({ color: "danger", description: t("restartError") });
    }
  };

  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start">
        <h2 className="text-2xl font-semibold text-green-900">
          {t("title")}
        </h2>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-700">
                {t("autoLiquidityLabel")}
              </span>
              <span className="text-sm text-gray-500">
                {t("autoLiquidityDescription")}
              </span>
              {enabled && (
                <span className="text-xs text-amber-600 mt-1">
                  ⚠ {t("autoLiquidityWarning")}
                </span>
              )}
            </div>

            <Switch
              isSelected={enabled}
              isDisabled={loading || restarting}
              onValueChange={handleToggle}
            />
          </div>

          {restarting && (
            <p className="text-sm text-gray-500 italic">{t("restarting")}</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
