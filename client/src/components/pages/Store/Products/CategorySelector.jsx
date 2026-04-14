"use client";

import { useState } from "react";

import { Button, Input, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

export function CategorySelector({
  categories = [],
  categoriesLoading = false,
  selectedCategories = [],
  onSelectionChange,
  createCategory,
  isRequired = false,
}) {
  const t = useTranslations("products");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || isCreatingCategory) return;
    try {
      setIsCreatingCategory(true);
      const newId = await createCategory(newCategoryName.trim());
      if (newId) {
        onSelectionChange([...selectedCategories, newId]);
      }
      setNewCategoryName("");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  return (
    <div className="space-y-4">
      <Select
        label={t("modal.productCategoryLabel")}
        placeholder={t("modal.categorySelectPlaceholder")}
        selectionMode="multiple"
        selectedKeys={new Set(selectedCategories)}
        isRequired={isRequired}
        errorMessage={t("modal.errorMsgSelectEmpty")}
        onSelectionChange={(keys) => onSelectionChange(Array.from(keys))}
        isLoading={categoriesLoading}
      >
        {categories.map((category) => (
          <SelectItem
            key={category.id}
            value={category.id}
            classNames={{ selectedIcon: "border-2 border-green-800 rounded-sm w-5 h-5 p-0.5" }}
          >
            {category.name}
          </SelectItem>
        ))}
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <Input
          label={t("modal.createCategoryLabel")}
          placeholder={t("modal.createCategoryPlaceholder")}
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
        />
        <Button
          color="primary"
          className="bg-green-800 sm:h-full"
          onPress={handleCreateCategory}
          isLoading={isCreatingCategory}
        >
          {t("modal.createCategoryButton")}
        </Button>
      </div>
    </div>
  );
}
