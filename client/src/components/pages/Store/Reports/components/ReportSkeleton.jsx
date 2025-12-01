"use client";
import { Card, CardBody, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

export function ReportSkeleton() {
  const t = useTranslations("reports");
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardBody className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" color="success" />
          <p className="text-lg font-semibold text-deep mt-4">{t("statuses.loading")}</p>
        </CardBody>
      </Card>
    </div>
  );
}
