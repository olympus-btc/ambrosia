"use client";

import { useState } from "react";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";

import { LogFilesActions } from "./LogFilesActions";
import { LogSettingsForm } from "./LogSettingsForm";
import { LogsViewerModal } from "./LogsViewerModal";

export function LogsCard() {
  const logsTranslations = useTranslations("settings");
  const [isLogsViewerModalOpen, setIsLogsViewerModalOpen] = useState(false);

  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start gap-3 pb-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
            {logsTranslations("cardLogs.title")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {logsTranslations("cardLogs.subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <LogFilesActions />
          <Button
            variant="bordered"
            size="sm"
            className="border border-green-800 text-green-800"
            startContent={<ScrollText aria-hidden="true" className="w-3.5 h-3.5" />}
            onPress={() => setIsLogsViewerModalOpen(true)}
          >
            {logsTranslations("cardLogs.openViewerButton")}
          </Button>
        </div>
      </CardHeader>

      <CardBody className="gap-4">
        <LogSettingsForm />
      </CardBody>

      <LogsViewerModal isOpen={isLogsViewerModalOpen} onClose={() => setIsLogsViewerModalOpen(false)} />
    </Card>
  );
}
