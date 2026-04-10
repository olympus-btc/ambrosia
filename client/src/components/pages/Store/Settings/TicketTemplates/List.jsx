"use client";

import { Button, Select, SelectItem } from "@heroui/react";

export function TemplateList({
  templates,
  selectedId,
  loading,
  error,
  onSelect,
  onNew,
  t,
}) {
  const handleSelectionChange = (e) => {
    const templateId = e.target.value;
    if (!templateId) return;
    const template = templates.find((tpl) => tpl.id === templateId);
    if (template) {
      onSelect(template);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {error && (
        <p className="text-sm text-red-600">{t("templates.error")}</p>
      )}
      <div className="flex flex-col gap-3">
        <Select
          label={t("templates.listTitle")}
          placeholder={t("templates.selectPlaceholder")}
          selectedKeys={selectedId ? [selectedId] : []}
          onChange={handleSelectionChange}
          isLoading={loading}
        >
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </Select>
        <div className="flex justify-end">
          <Button
            color="primary"
            className="h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium bg-green-800"
            onPress={onNew}
          >
            {t("templates.addTemplate")}
          </Button>
        </div>
      </div>
    </div>
  );
}
