"use client";

import { Card, CardBody, CardHeader, Spinner, Switch } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

import WalletGuard from "@components/auth/WalletGuard";

export function LightningCardUnlocked({
  enabled,
  loading,
  restarting,
  onToggle,
  onAuthorized,
  onHide,
  lightningCardTranslations,
}) {
  return (
    <WalletGuard
      onAuthorized={onAuthorized}
      onCancel={onHide}
      title={lightningCardTranslations("modalTitle")}
      passwordLabel={lightningCardTranslations("passwordLabel")}
      confirmText={lightningCardTranslations("confirmButton")}
      cancelText={lightningCardTranslations("cancelButton")}
    >
      <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
        <CardHeader className="flex flex-col items-start">
          <h2 className="text-2xl font-semibold text-green-900">
            {lightningCardTranslations("title")}
          </h2>
        </CardHeader>

        <CardBody>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner size="lg" color="success" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-gray-700">
                    {lightningCardTranslations("autoLiquidityLabel")}
                  </span>
                  <span className="text-sm text-gray-500">
                    {lightningCardTranslations("autoLiquidityDescription")}
                  </span>
                  {enabled && (
                    <span className="flex items-start gap-1 text-xs text-amber-600 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{lightningCardTranslations("autoLiquidityWarning")}</span>
                    </span>
                  )}
                </div>

                <Switch
                  isSelected={enabled}
                  isDisabled={restarting}
                  onValueChange={onToggle}
                  aria-label={lightningCardTranslations("autoLiquidityLabel")}
                />
              </div>

              {restarting && (
                <p className="text-sm text-gray-500 italic">{lightningCardTranslations("restarting")}</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </WalletGuard>
  );
}
