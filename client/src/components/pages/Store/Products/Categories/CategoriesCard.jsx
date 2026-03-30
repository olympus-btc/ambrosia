"use client";

import { Button, Card, CardBody } from "@heroui/react";
import { Pencil, Trash } from "lucide-react";

import { RequirePermission } from "@/hooks/usePermission";

export function CategoriesCard({ category, canManageCategories, onEditCategory, onDeleteCategory }) {
  return (
    <Card shadow="sm" className="border border-green-800">
      <CardBody className="flex flex-row items-center justify-between gap-3 p-3">
        <span className="font-medium text-sm truncate">{category.name}</span>
        {canManageCategories && (
          <div className="flex gap-2 shrink-0">
            <RequirePermission allOf={["categories_update"]}>
              <Button
                aria-label="Edit Category"
                isIconOnly
                size="sm"
                className="text-xs text-white bg-blue-500"
                onPress={() => onEditCategory(category)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </RequirePermission>
            <RequirePermission allOf={["categories_delete"]}>
              <Button
                aria-label="Delete Category"
                isIconOnly
                size="sm"
                color="danger"
                className="text-xs text-white"
                onPress={() => onDeleteCategory(category)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </RequirePermission>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
