"use client";

import { Button, Card, CardBody, CardHeader, Spinner } from "@heroui/react";
import { AlertTriangle, PenLine } from "lucide-react";

import WalletGuard from "@components/auth/WalletGuard";

export function SeedCardUnlocked({ seed, onAuthorized, onHide, t }) {
  const words = seed ? seed.split(" ").filter(Boolean) : [];

  return (
    <WalletGuard
      onAuthorized={onAuthorized}
      onCancel={onHide}
      title={t("cardSeed.modalTitle")}
      passwordLabel={t("cardSeed.passwordLabel")}
      confirmText={t("cardSeed.confirmButton")}
      cancelText={t("cardSeed.cancelButton")}
    >
      <Card shadow="none" className="rounded-lg p-6 shadow-lg">
        <CardHeader className="flex flex-col items-start pb-0">
          <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
            {t("cardSeed.title")}
          </h2>
        </CardHeader>

        <CardBody>
          <div className="flex flex-col max-w-2xl space-y-4">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {t("cardSeed.warning")}
              </p>
            </div>

            {seed ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                  {words.map((word, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded px-2 py-2 sm:px-3"
                    >
                      <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                      <span className="font-mono text-xs sm:text-sm text-green-900 font-medium truncate">{word}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <PenLine className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 font-medium">
                    {t("cardSeed.paperNote")}
                  </p>
                </div>
                <div>
                  <Button
                    variant="bordered"
                    onPress={onHide}
                    className="h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    {t("cardSeed.hideButton")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Spinner size="lg" color="success" />
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </WalletGuard>
  );
}
