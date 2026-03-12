"use client";

import { useState } from "react";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";

import { AddCategoriesModal } from "./AddCategoriesModal";
import { CategoriesTable } from "./CategoriesTable";
import { DeleteCategoriesModal } from "./DeleteCategoriesModal";
import { EditCategoriesModal } from "./EditCategoriesModal";

export function Categories({ categories, createCategory, updateCategory, deleteCategory, refetch }) {
  const [addCategoriesShowModal, setAddCategoriesShowModal] = useState(false);
  const [editCategoriesShowModal, setEditCategoriesShowModal] = useState(false);
  const [deleteCategoriesShowModal, setDeleteCategoriesShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [data, setData] = useState({
    categoryId: "",
    categoryName: "",
  });

  const t = useTranslations("categories");

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setData({
      categoryId: category.id,
      categoryName: category.name,
    });
    setEditCategoriesShowModal(true);
  };

  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoriesShowModal(true);
  };

  const handleAddCategory = async (data) => {
    await createCategory(data.categoryName, "product");
    await refetch();
  };

  return (
    <RequirePermission allOf={["categories_read"]}>
      <header className="flex items-center justify-between mb-6 mt-10">
        <div>
          <h2 className="text-2xl font-semibold text-green-900">{t("title")}</h2>
          <p className="text-gray-800 mt-2">{t("subtitle")}</p>
        </div>
        <RequirePermission allOf={["categories_create"]}>
          <Button
            color="primary"
            className="bg-green-800"
            onPress={() => {
              setData({ categoryId: "", categoryName: "" });
              setAddCategoriesShowModal(true);
            }}
          >
            {t("addCategory")}
          </Button>
        </RequirePermission>
      </header>
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        <CategoriesTable
          categories={categories}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>

      <AddCategoriesModal
        data={data}
        setData={setData}
        addCategory={handleAddCategory}
        onChange={handleDataChange}
        addCategoriesShowModal={addCategoriesShowModal}
        setAddCategoriesShowModal={setAddCategoriesShowModal}
      />

      <EditCategoriesModal
        data={data}
        setData={setData}
        category={selectedCategory}
        onChange={handleDataChange}
        updateCategory={updateCategory}
        editCategoriesShowModal={editCategoriesShowModal}
        setEditCategoriesShowModal={setEditCategoriesShowModal}
      />

      <DeleteCategoriesModal
        category={categoryToDelete}
        deleteCategoriesShowModal={deleteCategoriesShowModal}
        setDeleteCategoriesShowModal={setDeleteCategoriesShowModal}
        onConfirm={async () => {
          if (categoryToDelete?.id) {
            await deleteCategory(categoryToDelete.id);
          }
          setDeleteCategoriesShowModal(false);
        }}
      />
    </RequirePermission>
  );
}
