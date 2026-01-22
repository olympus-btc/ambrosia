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
      <div className="flex flex-col gap-4">
        <Select
          label={t("templates.listTitle")}
          placeholder={t("templates.selectPlaceholder")}
          selectedKeys={selectedId ? [selectedId] : []}
          onChange={handleSelectionChange}
          isLoading={loading}
          className="flex-1"
        >
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </Select>
        <div className="w-full">
          <Button color="primary" onPress={onNew}>
            {t("templates.addTemplate")}
          </Button>
        </div>
      </div>
    </div>
  );
}
