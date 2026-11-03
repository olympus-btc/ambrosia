"use client";

import { Button, Card, CardBody, CardFooter, CardHeader } from "@heroui/react";

export function ExportDataCardLocked({ onReveal, exportDataTranslations }) {
  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {exportDataTranslations("cardExportData.title")}
        </h2>
      </CardHeader>

      <CardBody className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">
          {exportDataTranslations("cardExportData.description")}
        </p>
        <p className="text-sm text-gray-500">
          {exportDataTranslations("cardExportData.passwordNotice")}
        </p>
      </CardBody>

      <CardFooter>
        <Button
          color="primary"
          className="bg-green-800 h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
          onPress={onReveal}
        >
          {exportDataTranslations("cardExportData.exportButton")}
        </Button>
      </CardFooter>
    </Card>
  );
}
