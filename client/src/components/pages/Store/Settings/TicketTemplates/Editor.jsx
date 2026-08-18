"use client";

import { Input } from "@heroui/react";

import { TemplateElementsEditor } from "./ElementsEditor";

export function TicketTemplatesEditor({
  name,
  onNameChange,
  elements,
  onElementChange,
  onElementAdd,
  onElementReorder,
  onElementRemove,
  config,
  settingsTranslations,
}) {
  return (
    <div className="flex min-w-0 flex-2 flex-col gap-4">
      <Input
        label={settingsTranslations("templates.nameLabel")}
        value={name}
        onChange={onNameChange}
      />

      <TemplateElementsEditor
        elements={elements}
        onChange={onElementChange}
        onAdd={onElementAdd}
        onReorder={onElementReorder}
        onRemove={onElementRemove}
        config={config}
        settingsTranslations={settingsTranslations}
      />
    </div>
  );
}
