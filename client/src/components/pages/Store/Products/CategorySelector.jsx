"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Autocomplete,
  AutocompleteItem,
  Chip,
} from "@heroui/react";
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
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const comboboxInputRef = useRef(null);
  const closeFrameRef = useRef(null);
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category.name])),
    [categories],
  );

  const selectedCategoryNames = useMemo(
    () => selectedCategories.flatMap((categoryId) => {
      const categoryName = categoryNameById.get(String(categoryId));
      return categoryName ? [{ id: categoryId, name: categoryName }] : [];
    }),
    [categoryNameById, selectedCategories],
  );

  const appendSelectedCategory = (categoryId) => {
    if (!categoryId || selectedCategories.includes(categoryId)) return;
    onSelectionChange([...selectedCategories, categoryId]);
  };

  useEffect(() => {
    setSearchValue("");
  }, [selectedCategories]);

  useEffect(() => {
    if (categoriesLoading || selectedCategories.length === 0) return;

    const filteredCategoryIds = selectedCategories.filter((categoryId) => categoryNameById.has(String(categoryId)));
    if (filteredCategoryIds.length !== selectedCategories.length) {
      onSelectionChange(filteredCategoryIds);
    }
  }, [categoriesLoading, categoryNameById, onSelectionChange, selectedCategories]);

  useEffect(() => () => {
    if (closeFrameRef.current !== null) {
      cancelAnimationFrame(closeFrameRef.current);
    }
  }, []);

  const scheduleComboboxClose = ({ clearSearch = false } = {}) => {
    if (closeFrameRef.current !== null) {
      cancelAnimationFrame(closeFrameRef.current);
    }

    closeFrameRef.current = requestAnimationFrame(() => {
      comboboxInputRef.current?.blur();
      if (clearSearch) {
        setSearchValue("");
      }
      closeFrameRef.current = null;
    });
  };

  const handleComboboxCreateCategory = async (categoryName) => {
    const trimmedCategoryName = categoryName.trim();
    if (!trimmedCategoryName || isCreatingCategory) return;

    try {
      scheduleComboboxClose({ clearSearch: true });
      setIsCreatingCategory(true);
      const newId = await createCategory(trimmedCategoryName);

      appendSelectedCategory(newId);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const trimmedSearchValue = searchValue.trim();
  const normalizedSearchValue = trimmedSearchValue.toLocaleLowerCase();
  const exactMatch = categories.some(
    (category) => category.name.trim().toLocaleLowerCase() === normalizedSearchValue,
  );
  const createOptionKey = trimmedSearchValue ? `create:${trimmedSearchValue}` : null;

  return (
    <div className="space-y-3">
      <Autocomplete
        ref={comboboxInputRef}
        label={t("modal.productCategoryLabel")}
        placeholder={t("modal.categorySelectPlaceholder")}
        inputValue={searchValue}
        selectedKey={null}
        isLoading={categoriesLoading || isCreatingCategory}
        isRequired={isRequired}
        errorMessage={t("modal.errorMsgSelectEmpty")}
        allowsCustomValue
        allowsEmptyCollection
        isClearable
        menuTrigger="input"
        onInputChange={setSearchValue}
        onSelectionChange={(key) => {
          if (!key) {
            setSearchValue("");
            return;
          }

          if (typeof key === "string" && key.startsWith("create:")) {
            handleComboboxCreateCategory(key.slice("create:".length));
            return;
          }

          appendSelectedCategory(key);
          scheduleComboboxClose({ clearSearch: true });
        }}
        onClear={() => {
          setSearchValue("");
        }}
      >
        {categories.map((category) => (
          <AutocompleteItem
            key={category.id}
            textValue={category.name}
            data-category-id={category.id}
          >
            {category.name}
          </AutocompleteItem>
        ))}

        {!exactMatch && createOptionKey ? (
          <AutocompleteItem
            key={createOptionKey}
            textValue={t("modal.createCategoryOption", { name: trimmedSearchValue })}
            data-create-value={trimmedSearchValue}
          >
            {t("modal.createCategoryOption", { name: trimmedSearchValue })}
          </AutocompleteItem>
        ) : null}
      </Autocomplete>

      {selectedCategoryNames.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedCategoryNames.map((category) => (
            <Chip
              key={category.id}
              variant="flat"
              onClose={() => onSelectionChange(selectedCategories.filter((id) => id !== category.id))}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
