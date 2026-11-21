"use client";

import { Chip } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { CONFIGURABLE_SERVER_LOG_LEVELS, LOG_LEVEL_INFO } from "@/lib/logs";

import { resolveLogLevelTextClassName } from "./logLevelTextClassNames";

export function LogLevelsGuide() {
  const logsTranslations = useTranslations("settings");

  return (
    <details className="group rounded-lg border border-gray-200 bg-gray-50" data-testid="log-levels-guide">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-green-800 [&::-webkit-details-marker]:hidden">
        {logsTranslations("cardLogs.levelsGuide.title")}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-gray-200 px-3 py-3">
        <p className="text-sm text-gray-600">{logsTranslations("cardLogs.levelsGuide.introduction")}</p>
        <dl className="flex flex-col gap-3">
          {CONFIGURABLE_SERVER_LOG_LEVELS.map((configurableServerLogLevel) => (
            <div key={configurableServerLogLevel} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <dt className="flex shrink-0 items-center gap-2 sm:w-40">
                <span className={`font-mono text-sm font-semibold ${resolveLogLevelTextClassName(configurableServerLogLevel)}`}>
                  {configurableServerLogLevel}
                </span>
                {configurableServerLogLevel === LOG_LEVEL_INFO && (
                  <Chip size="sm" variant="flat" color="success">
                    {logsTranslations("cardLogs.levelsGuide.recommended")}
                  </Chip>
                )}
              </dt>
              <dd className="text-sm text-gray-600">
                {logsTranslations(`cardLogs.levelsGuide.levelDescriptions.${configurableServerLogLevel}`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
