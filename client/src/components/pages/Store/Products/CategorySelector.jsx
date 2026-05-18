"use client";

import {
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCategorySelector } from "./hooks/useCategorySelector";
import { SelectedCategoryChips } from "./SelectedCategoryChips";

export function CategorySelector({
  categories = [],
  categoriesLoading = false,
  selectedCategories = [],
  onSelectionChange,
  createCategory,
  isRequired = false,
}) {
  const t = useTranslations("products");
  const {
    comboboxInputRef,
    searchValue,
    setSearchValue,
    clearSearchValue,
    categoryOptions,
    selectedCategoryIdSet,
    selectedCategoryChips,
    removeSelectedCategory,
    typedCategoryName,
    hasMatchingCategory,
    createOptionKey,
    isSelectorLoading,
    handleAutocompleteSelection,
  } = useCategorySelector({
    categories,
    categoriesLoading,
    selectedCategories,
    onSelectionChange,
    createCategory,
  });
  const createOptionLabel = createOptionKey
    ? t("modal.createCategoryOption", { name: typedCategoryName })
    : null;
  const showEmptyCategoriesMessage = categoryOptions.length === 0 && !createOptionKey;

  return (
    <div className="space-y-3">
      <Autocomplete
        ref={comboboxInputRef}
        label={t("modal.productCategoryLabel")}
        placeholder={t("modal.categorySelectPlaceholder")}
        inputValue={searchValue}
        selectedKey={null}
        isLoading={isSelectorLoading}
        isRequired={isRequired}
        errorMessage={t("modal.errorMsgSelectEmpty")}
        allowsCustomValue
        allowsEmptyCollection
        isClearable
        menuTrigger="focus"
        onInputChange={setSearchValue}
        onSelectionChange={handleAutocompleteSelection}
        onClear={clearSearchValue}
      >
        {categoryOptions.map((category) => (
          <AutocompleteItem
            key={category.id}
            textValue={category.name}
            data-category-id={category.id}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{category.name}</span>
              {selectedCategoryIdSet.has(category.key) ? (
                <span aria-hidden="true" className="text-green-700 text-sm font-semibold">
                  ✓
                </span>
              ) : null}
            </div>
          </AutocompleteItem>
        ))}

        {showEmptyCategoriesMessage ? (
          <AutocompleteItem key="empty-categories" isDisabled textValue={t("modal.noCategoriesAvailable")}>
            {t("modal.noCategoriesAvailable")}
          </AutocompleteItem>
        ) : null}

        {!hasMatchingCategory && createOptionKey ? (
          <AutocompleteItem
            key={createOptionKey}
            textValue={createOptionLabel}
            data-create-value={typedCategoryName}
          >
            {createOptionLabel}
          </AutocompleteItem>
        ) : null}
      </Autocomplete>

      <SelectedCategoryChips categories={selectedCategoryChips} onRemove={removeSelectedCategory} />
    </div>
  );
}
