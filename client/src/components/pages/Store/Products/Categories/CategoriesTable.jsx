"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from "@heroui/react";
import { Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";

export function CategoriesTable({ categories, canManageCategories, onEditCategory, onDeleteCategory }) {
  const t = useTranslations("categories");

  return (
    <Table className="min-w-[400px]" removeWrapper aria-label={t("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3 w-[200px]">{t("name")}</TableColumn>
        <TableColumn className={canManageCategories ? "py-2 px-3 w-[100px] text-right" : "hidden"}>{t("actions")}</TableColumn>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="max-w-[200px] truncate">{category.name}</TableCell>
            <TableCell className={canManageCategories ? "py-2 px-3" : "hidden"}>
              <div className="flex justify-end gap-2">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
