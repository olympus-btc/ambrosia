"use client";

import { usePermission } from "@/hooks/usePermission";

import { CategoriesCard } from "./CategoriesCard";
import { CategoriesTable } from "./CategoriesTable";

export function CategoriesList({ categories, onEditCategory, onDeleteCategory }) {
  const canManageCategories = usePermission({ anyOf: ["categories_update", "categories_delete"] });

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {categories.map((category) => (
          <CategoriesCard
            key={category.id}
            category={category}
            canManageCategories={canManageCategories}
            onEditCategory={onEditCategory}
            onDeleteCategory={onDeleteCategory}
          />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <CategoriesTable
          categories={categories}
          canManageCategories={canManageCategories}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
        />
      </div>
    </section>
  );
}
