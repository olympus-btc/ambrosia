export function withOpenedTimeEntryOption(catalogOptions, openedOptionId, openedOptionName) {
  if (!openedOptionId || catalogOptions.some((catalogOption) => catalogOption.id === openedOptionId)) {
    return catalogOptions;
  }
  return [{ id: openedOptionId, name: openedOptionName }, ...catalogOptions];
}
