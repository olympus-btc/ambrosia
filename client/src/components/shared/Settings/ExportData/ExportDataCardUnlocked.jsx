"use client";

import { Card, CardBody, CardHeader, Progress, Spinner } from "@heroui/react";

import WalletGuard from "@components/auth/WalletGuard";

function exportPhaseLabel(exportDataTranslations, phase) {
  if (phase === "preparing") return exportDataTranslations("cardExportData.phasePreparing");
  if (phase === "writing") return exportDataTranslations("cardExportData.phaseWriting");
  return exportDataTranslations("cardExportData.exporting");
}

export function ExportDataCardUnlocked({ onAuthorized, onHide, exportDataTranslations, exportProgress }) {
  return (
    <WalletGuard
      onAuthorized={onAuthorized}
      onCancel={onHide}
      title={exportDataTranslations("cardExportData.modalTitle")}
      passwordLabel={exportDataTranslations("cardExportData.passwordLabel")}
      confirmText={exportDataTranslations("cardExportData.confirmButton")}
      cancelText={exportDataTranslations("cardExportData.cancelButton")}
    >
      <Card shadow="none" className="rounded-lg p-6 shadow-lg">
        <CardHeader className="flex flex-col items-start pb-0">
          <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
            {exportDataTranslations("cardExportData.title")}
          </h2>
        </CardHeader>

        <CardBody>
          <div className="flex flex-col items-center gap-2 py-6 w-full">
            {exportProgress?.percent != null ? (
              <>
                <Progress
                  aria-label={exportDataTranslations("cardExportData.exporting")}
                  value={exportProgress.percent}
                  className="max-w-full"
                  color="success"
                  size="sm"
                />
                <p className="text-sm text-gray-500">
                  {exportPhaseLabel(exportDataTranslations, exportProgress.phase)} {exportProgress.percent}%
                </p>
              </>
            ) : (
              <>
                <Spinner size="lg" color="success" />
                <p className="text-sm text-gray-500">
                  {exportProgress ? exportPhaseLabel(exportDataTranslations, exportProgress.phase) : exportDataTranslations("cardExportData.exporting")}
                </p>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </WalletGuard>
  );
}
