import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildCreateOptionKey,
  isCreateOptionKey,
  normalizeCategoryId,
  normalizeCategoryName,
  parseCreateOptionName,
} from "../utils/categorySelector";

export function useCategorySelector({
  categories,
  categoriesLoading,
  selectedCategories,
  onSelectionChange,
  createCategory,
}) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const comboboxInputRef = useRef(null);
  const closeFrameRef = useRef(null);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({
      id: category.id,
      key: normalizeCategoryId(category.id),
      name: category.name,
      normalizedName: normalizeCategoryName(category.name),
    })),
    [categories],
  );

  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((category) => [category.key, category.name])),
    [categoryOptions],
  );

  const selectedCategoryIdSet = useMemo(
    () => new Set(selectedCategories.map((categoryId) => normalizeCategoryId(categoryId))),
    [selectedCategories],
  );

  const selectedCategoryChips = useMemo(
    () => selectedCategories.flatMap((categoryId) => {
      const categoryName = categoryNameById.get(normalizeCategoryId(categoryId));
      return categoryName ? [{ id: categoryId, name: categoryName }] : [];
    }),
    [categoryNameById, selectedCategories],
  );

  const clearSearchValue = () => {
    setSearchValue("");
  };

  const addSelectedCategory = (categoryId) => {
    if (!categoryId || selectedCategoryIdSet.has(normalizeCategoryId(categoryId))) return;
    onSelectionChange([...selectedCategories, categoryId]);
  };

  const removeSelectedCategory = (categoryId) => {
    onSelectionChange(selectedCategories.filter((selectedCategoryId) => selectedCategoryId !== categoryId));
  };

  const toggleSelectedCategory = (categoryId) => {
    if (!categoryId) return;

    if (selectedCategoryIdSet.has(normalizeCategoryId(categoryId))) {
      removeSelectedCategory(categoryId);
      return;
    }

    addSelectedCategory(categoryId);
  };

  useEffect(() => {
    clearSearchValue();
  }, [selectedCategories]);

  useEffect(() => {
    if (categoriesLoading || selectedCategories.length === 0) return;

    const filteredCategoryIds = selectedCategories.filter((categoryId) => categoryNameById.has(normalizeCategoryId(categoryId)));
    if (filteredCategoryIds.length !== selectedCategories.length) {
      onSelectionChange(filteredCategoryIds);
    }
  }, [categoriesLoading, categoryNameById, onSelectionChange, selectedCategories]);

  useEffect(() => () => {
    if (closeFrameRef.current !== null) {
      cancelAnimationFrame(closeFrameRef.current);
    }
  }, []);

  const closeAutocompletePopover = ({ clearSearch = false } = {}) => {
    if (closeFrameRef.current !== null) {
      cancelAnimationFrame(closeFrameRef.current);
    }

    closeFrameRef.current = requestAnimationFrame(() => {
      comboboxInputRef.current?.blur();
      if (clearSearch) {
        clearSearchValue();
      }
      closeFrameRef.current = null;
    });
  };

  const handleCreateCategory = async (categoryName) => {
    const trimmedCategoryName = categoryName.trim();
    if (!trimmedCategoryName || isCreatingCategory) return;

    try {
      closeAutocompletePopover({ clearSearch: true });
      setIsCreatingCategory(true);
      const newId = await createCategory(trimmedCategoryName);

      addSelectedCategory(newId);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const typedCategoryName = searchValue.trim();
  const normalizedTypedCategoryName = normalizeCategoryName(typedCategoryName);
  const hasMatchingCategory = categoryOptions.some(
    (category) => category.normalizedName === normalizedTypedCategoryName,
  );
  const createOptionKey = typedCategoryName ? buildCreateOptionKey(typedCategoryName) : null;
  const isSelectorLoading = categoriesLoading || isCreatingCategory;

  const handleAutocompleteSelection = (key) => {
    if (!key) {
      clearSearchValue();
      return;
    }

    if (isCreateOptionKey(key)) {
      handleCreateCategory(parseCreateOptionName(key));
      return;
    }

    toggleSelectedCategory(key);
    closeAutocompletePopover({ clearSearch: true });
  };

  return {
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
  };
}
