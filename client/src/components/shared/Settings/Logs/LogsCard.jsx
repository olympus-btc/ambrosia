"use client";

import { useState } from "react";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { LogsCardContent } from "./LogsCardContent";

const LOGS_CARD_CONTENT_ELEMENT_ID = "logs-card-content";

export function LogsCard() {
  const logsTranslations = useTranslations("settings");
  const [isLogsCardExpanded, setIsLogsCardExpanded] = useState(false);

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
        <Button
          variant="flat"
          size="sm"
          className="shrink-0"
          aria-expanded={isLogsCardExpanded}
          aria-controls={LOGS_CARD_CONTENT_ELEMENT_ID}
          endContent={(
            <ChevronDown
              aria-hidden="true"
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isLogsCardExpanded ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          )}
          onPress={() => setIsLogsCardExpanded((wasLogsCardExpanded) => !wasLogsCardExpanded)}
        >
          {logsTranslations(isLogsCardExpanded ? "cardLogs.hideLogsButton" : "cardLogs.showLogsButton")}
        </Button>
      </CardHeader>

      {isLogsCardExpanded && (
        <CardBody id={LOGS_CARD_CONTENT_ELEMENT_ID} className="gap-4">
          <LogsCardContent />
        </CardBody>
      )}
    </Card>
  );
}
