"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

export function CategoriesTable({ categories, canManageCategories, onEditCategory, onDeleteCategory }) {
  const categoryTranslations = useTranslations("categories");

  return (
    <Table className="min-w-[400px]" removeWrapper aria-label={categoryTranslations("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3 w-[200px]">{categoryTranslations("name")}</TableColumn>
        <TableColumn className={canManageCategories ? "py-2 px-3 w-40 text-right" : "hidden"}>{categoryTranslations("actions")}</TableColumn>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="max-w-[200px] truncate">{category.name}</TableCell>
            <TableCell className={canManageCategories ? "py-2 px-3" : "hidden"}>
              <div className="flex justify-end gap-2">
                <RequirePermission allOf={["categories_update"]}>
                  <EditButton onPress={() => onEditCategory(category)}>{categoryTranslations("edit")}</EditButton>
                </RequirePermission>
                <RequirePermission allOf={["categories_delete"]}>
                  <DeleteButton onPress={() => onDeleteCategory(category)}>{categoryTranslations("delete")}</DeleteButton>
                </RequirePermission>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
