"use client";

import { useCallback, useState } from "react";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@heroui/react";

import { TemplateElementRow } from "./TemplateElementRow";

export function TemplateElementsEditor({ elements, onChange, onAdd, onReorder, onRemove, config, t }) {
  const [openIds, setOpenIds] = useState(() => new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = elements.findIndex((el) => el.localId === active.id);
    const newIndex = elements.findIndex((el) => el.localId === over.id);
    onReorder(arrayMove(elements, oldIndex, newIndex));
  }, [elements, onReorder]);

  const handleAdd = () => {
    const newElement = onAdd();
    if (newElement?.localId) {
      setOpenIds((prev) => new Set([...prev, newElement.localId]));
    }
  };

  const handleToggle = (localId) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) {
        next.delete(localId);
      } else {
        next.add(localId);
      }
      return next;
    });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-green-900">
          {t("templates.elementsTitle")}
        </h3>
        <Button color="primary" onPress={handleAdd}>
          {t("templates.addElement")}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={elements.map((el) => el.localId)} strategy={verticalListSortingStrategy}>
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-2">
            {elements.map((element) => (
              <TemplateElementRow
                key={element.localId}
                element={element}
                isOpen={openIds.has(element.localId)}
                onToggle={() => handleToggle(element.localId)}
                onChange={onChange}
                onRemove={onRemove}
                config={config}
                t={t}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
