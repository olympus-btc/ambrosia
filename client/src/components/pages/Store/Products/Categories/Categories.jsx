"use client";

import { useState } from "react";

import { addToast, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";

import { AddCategoriesModal } from "./AddCategoriesModal";
import { CategoriesList } from "./CategoriesList";
import { DeleteCategoriesModal } from "./DeleteCategoriesModal";
import { EditCategoriesModal } from "./EditCategoriesModal";

export function Categories({ categories, createCategory, updateCategory, deleteCategory, refreshData }) {
  const [addCategoriesShowModal, setAddCategoriesShowModal] = useState(false);
  const [editCategoriesShowModal, setEditCategoriesShowModal] = useState(false);
  const [deleteCategoriesShowModal, setDeleteCategoriesShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    categoryId: "",
    categoryName: "",
  });

  const categoryTranslations = useTranslations("categories");

  const handleCategoryFormChange = (categoryFormUpdates) => {
    setCategoryForm((previousCategoryForm) => ({ ...previousCategoryForm, ...categoryFormUpdates }));
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setCategoryForm({
      categoryId: category.id,
      categoryName: category.name,
    });
    setEditCategoriesShowModal(true);
  };

  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoriesShowModal(true);
  };

  const handleAddCategory = async (formData) => {
    try {
      await createCategory(formData.categoryName, "product");
      await refreshData();
      addToast({ description: categoryTranslations("toasts.createSuccess"), color: "success" });
    } catch (createCategoryError) {
      addToast({
        title: categoryTranslations("toasts.createErrorTitle"),
        description: categoryTranslations("toasts.createErrorDescription"),
        color: "danger",
      });
      throw createCategoryError;
    }
  };

  const handleUpdateCategory = async (formData) => {
    try {
      await updateCategory(formData);
      addToast({ description: categoryTranslations("toasts.updateSuccess"), color: "success" });
    } catch (updateCategoryError) {
      addToast({
        title: categoryTranslations("toasts.updateErrorTitle"),
        description: categoryTranslations("toasts.updateErrorDescription"),
        color: "danger",
      });
      throw updateCategoryError;
    }
  };

  const handleConfirmDeleteCategory = async () => {
    try {
      if (categoryToDelete?.id) {
        await deleteCategory(categoryToDelete.id);
        await refreshData();
        addToast({ description: categoryTranslations("toasts.deleteSuccess"), color: "success" });
      }
      setDeleteCategoriesShowModal(false);
    } catch (deleteCategoryError) {
      addToast({
        title: categoryTranslations("toasts.deleteErrorTitle"),
        description: categoryTranslations("toasts.deleteErrorDescription"),
        color: "danger",
      });
      throw deleteCategoryError;
    }
  };

  return (
    <RequirePermission allOf={["categories_read"]}>
      <header className="flex items-center justify-between mb-6 mt-10">
        <div>
          <h2 className="text-lg md:text-2xl font-semibold text-green-900">{categoryTranslations("title")}</h2>
          <p className="text-gray-800 mt-1 md:mt-2 text-sm">{categoryTranslations("subtitle")}</p>
        </div>
        <RequirePermission allOf={["categories_create"]}>
          <Button
            color="primary"
            className="bg-green-800"
            onPress={() => {
              setCategoryForm({ categoryId: "", categoryName: "" });
              setAddCategoriesShowModal(true);
            }}
          >
            {categoryTranslations("addCategory")}
          </Button>
        </RequirePermission>
      </header>
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        <CategoriesList
          categories={categories}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>

      <AddCategoriesModal
        categoryForm={categoryForm}
        setCategoryForm={setCategoryForm}
        addCategory={handleAddCategory}
        onChange={handleCategoryFormChange}
        addCategoriesShowModal={addCategoriesShowModal}
        setAddCategoriesShowModal={setAddCategoriesShowModal}
      />

      <EditCategoriesModal
        categoryForm={categoryForm}
        setCategoryForm={setCategoryForm}
        category={selectedCategory}
        onChange={handleCategoryFormChange}
        updateCategory={handleUpdateCategory}
        editCategoriesShowModal={editCategoriesShowModal}
        setEditCategoriesShowModal={setEditCategoriesShowModal}
      />

      <DeleteCategoriesModal
        category={categoryToDelete}
        deleteCategoriesShowModal={deleteCategoriesShowModal}
        setDeleteCategoriesShowModal={setDeleteCategoriesShowModal}
        onConfirm={handleConfirmDeleteCategory}
      />
    </RequirePermission>
  );
}
