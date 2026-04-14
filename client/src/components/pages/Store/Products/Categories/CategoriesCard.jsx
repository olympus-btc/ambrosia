"use client";

import { Card, CardBody } from "@heroui/react";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

export function CategoriesCard({ category, canManageCategories, onEditCategory, onDeleteCategory }) {
  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-row items-center justify-between gap-3 p-3">
        <span className="font-medium text-sm truncate">{category.name}</span>
        {canManageCategories && (
          <div className="flex gap-2 shrink-0">
            <RequirePermission allOf={["categories_update"]}>
              <EditButton onPress={() => onEditCategory(category)} />
            </RequirePermission>
            <RequirePermission allOf={["categories_delete"]}>
              <DeleteButton onPress={() => onDeleteCategory(category)} />
            </RequirePermission>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
