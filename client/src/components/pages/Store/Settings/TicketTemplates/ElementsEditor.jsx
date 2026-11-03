"use client";

import { useCallback, useState } from "react";

import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@heroui/react";

import { TemplateElementRow } from "./ElementRow";

export function TemplateElementsEditor({ templateElements, ticketType, onChange, onAdd, onReorder, onRemove, config, printFormats, settingsTranslations }) {
  const [openIds, setOpenIds] = useState(() => new Set());

  const dragSensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = templateElements.findIndex((element) => element.localId === active.id);
    const newIndex = templateElements.findIndex((element) => element.localId === over.id);
    onReorder(arrayMove(templateElements, oldIndex, newIndex));
  }, [templateElements, onReorder]);

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
        <h3 className="text-base sm:text-lg font-semibold text-green-900">
          {settingsTranslations("templates.elementsTitle")}
        </h3>
        <Button color="primary" className="bg-green-800" onPress={handleAdd}>
          {settingsTranslations("templates.addElement")}
        </Button>
      </div>

      <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={templateElements.map((element) => element.localId)} strategy={verticalListSortingStrategy}>
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-2">
            {templateElements.map((element) => (
              <TemplateElementRow
                key={element.localId}
                templateElement={element}
                ticketType={ticketType}
                isOpen={openIds.has(element.localId)}
                onToggle={() => handleToggle(element.localId)}
                onChange={onChange}
                onRemove={onRemove}
                businessConfig={config}
                printFormats={printFormats}
                settingsTranslations={settingsTranslations}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
