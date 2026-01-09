"use client";

import { Button } from "@heroui/react";

import { TemplateElementRow } from "./TemplateElementRow";

export function TemplateElementsEditor({ elements, onChange, onAdd, onMove, onRemove, t }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-green-900">
          {t("templates.elementsTitle")}
        </h3>
        <Button variant="bordered" onPress={onAdd}>
          {t("templates.addElement")}
        </Button>
      </div>

      <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-2">
        {elements.map((element) => (
          <TemplateElementRow
            key={element.localId}
            element={element}
            onChange={onChange}
            onMove={onMove}
            onRemove={onRemove}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
