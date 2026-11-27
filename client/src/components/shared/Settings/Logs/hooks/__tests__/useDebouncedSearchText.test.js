import { act, renderHook } from "@testing-library/react";

import { SEARCH_TEXT_DEBOUNCE_MILLISECONDS, useDebouncedSearchText } from "../useDebouncedSearchText";

describe("useDebouncedSearchText", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the latest search text only after the debounce delay", () => {
    const renderedDebouncedSearchTextHook = renderHook(
      ({ searchText }) => useDebouncedSearchText(searchText),
      { initialProps: { searchText: "" } },
    );

    renderedDebouncedSearchTextHook.rerender({ searchText: "pay" });
    renderedDebouncedSearchTextHook.rerender({ searchText: "payment" });

    expect(renderedDebouncedSearchTextHook.result.current).toBe("");

    act(() => {
      jest.advanceTimersByTime(SEARCH_TEXT_DEBOUNCE_MILLISECONDS);
    });

    expect(renderedDebouncedSearchTextHook.result.current).toBe("payment");
  });
});
