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

export function CategoriesTable({ categories, onEditCategory, onDeleteCategory }) {
  const t = useTranslations("categories");

  return (
    <section className="w-full overflow-x-auto">
      <Table className="min-w-[400px]" removeWrapper>
        <TableHeader>
          <TableColumn className="py-2 px-3 w-[200px]">{t("name")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[100px] text-right">{t("actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="max-w-[200px] truncate">{category.name}</TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex justify-end gap-2">
                  <Button
                    aria-label="Edit Category"
                    isIconOnly
                    size="sm"
                    className="text-xs text-white bg-blue-500"
                    onPress={() => onEditCategory(category)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
