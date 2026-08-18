"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";

import { TemplateList } from "./List";

export function TicketTemplatesCard({
  templates,
  loading,
  error,
  selectedId,
  onSelect,
  onNew,
  settingsTranslations,
}) {
  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("templates.title")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {settingsTranslations("templates.subtitle")}
        </p>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col max-w-2xl">
          <TemplateList
            templates={templates}
            selectedId={selectedId}
            loading={loading}
            error={error}
            onSelect={onSelect}
            onNew={onNew}
            settingsTranslations={settingsTranslations}
          />
        </div>
      </CardBody>
    </Card>
  );
}
