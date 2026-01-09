"use client";

import { Button } from "@heroui/react";

export function TemplateList({
  templates,
  selectedId,
  loading,
  error,
  onSelect,
  onNew,
  t,
}) {
  return (
    <div className="flex w-full flex-col gap-3 lg:w-1/3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-green-900">
          {t("templates.listTitle")}
        </h3>
        <Button variant="bordered" onPress={onNew}>
          {t("templates.newTemplate")}
        </Button>
      </div>
      {loading && (
        <p className="text-sm text-gray-600">{t("templates.loading")}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{t("templates.error")}</p>
      )}
      {!loading && templates.length === 0 && (
        <p className="text-sm text-gray-600">{t("templates.empty")}</p>
      )}
      <div className="flex flex-col gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={`rounded-md border px-3 py-2 text-left ${
              selectedId === template.id
                ? "border-green-600 bg-green-50 text-green-900"
                : "border-gray-200 text-gray-700"
            }`}
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
}
