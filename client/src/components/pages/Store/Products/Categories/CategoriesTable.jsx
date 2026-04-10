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
  const t = useTranslations("categories");

  return (
    <Table className="min-w-[400px]" removeWrapper aria-label={t("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3 w-[200px]">{t("name")}</TableColumn>
        <TableColumn className={canManageCategories ? "py-2 px-3 w-40 text-right" : "hidden"}>{t("actions")}</TableColumn>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="max-w-[200px] truncate">{category.name}</TableCell>
            <TableCell className={canManageCategories ? "py-2 px-3" : "hidden"}>
              <div className="flex justify-end gap-2">
                <RequirePermission allOf={["categories_update"]}>
                  <EditButton onPress={() => onEditCategory(category)}>{t("edit")}</EditButton>
                </RequirePermission>
                <RequirePermission allOf={["categories_delete"]}>
                  <DeleteButton onPress={() => onDeleteCategory(category)}>{t("delete")}</DeleteButton>
                </RequirePermission>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
