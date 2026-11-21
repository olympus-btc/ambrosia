"use client";

import { useEffect, useState } from "react";

export const SEARCH_TEXT_DEBOUNCE_MILLISECONDS = 300;

export function useDebouncedSearchText(searchText, debounceDelayMilliseconds = SEARCH_TEXT_DEBOUNCE_MILLISECONDS) {
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);

  useEffect(() => {
    const searchTextDebounceTimeoutId = setTimeout(() => setDebouncedSearchText(searchText), debounceDelayMilliseconds);
    return () => clearTimeout(searchTextDebounceTimeoutId);
  }, [searchText, debounceDelayMilliseconds]);

  return debouncedSearchText;
}
