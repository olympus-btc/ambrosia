"use client";

import { Button, Card, CardBody } from "@heroui/react";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { ReportProjectsList } from "./ReportProjectsList";

export function ReportProjectsDetailCard({ filters, projectGroups, projectRows, isExportDisabled, onExportCsv, onExportPdf }) {
  const reportTranslations = useTranslations("freelanceReports");

  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-lg">
            {reportTranslations("projectsTitle")}
            <span className="ml-2 text-sm font-normal text-default-400">
              ({projectGroups.length} {reportTranslations("records")})
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="bordered"
              size="sm"
              className="border border-green-800 text-green-800"
              startContent={<Download aria-hidden="true" className="w-3.5 h-3.5" />}
              isDisabled={isExportDisabled}
              onPress={onExportCsv}
            >
              {reportTranslations("exportCsv")}
            </Button>
            <Button
              variant="bordered"
              size="sm"
              className="border border-green-800 text-green-800"
              startContent={<Printer aria-hidden="true" className="w-3.5 h-3.5" />}
              isDisabled={isExportDisabled}
              onPress={onExportPdf}
            >
              {reportTranslations("exportPdf")}
            </Button>
          </div>
        </div>

        {filters}

        <ReportProjectsList projectGroups={projectGroups} projectRows={projectRows} />
      </CardBody>
    </Card>
  );
}
