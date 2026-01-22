"use client";

import { Input } from "@heroui/react";

import { TemplateElementsEditor } from "./TemplateElementsEditor";

export function TicketTemplatesEditor({
  name,
  onNameChange,
  elements,
  onElementChange,
  onElementAdd,
  onElementMove,
  onElementRemove,
  t,
}) {
  return (
    <div className="flex min-w-0 flex-2 flex-col gap-4">
      <Input
        label={t("templates.nameLabel")}
        value={name}
        onChange={onNameChange}
      />

      <TemplateElementsEditor
        elements={elements}
        onChange={onElementChange}
        onAdd={onElementAdd}
        onMove={onElementMove}
        onRemove={onElementRemove}
        t={t}
      />
    </div>
  );
}
