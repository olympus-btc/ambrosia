const CREATE_OPTION_PREFIX = "create:";

export function normalizeCategoryId(categoryId) {
  return String(categoryId);
}

export function normalizeCategoryName(categoryName) {
  return categoryName.trim().toLocaleLowerCase();
}

export function buildCreateOptionKey(categoryName) {
  return `${CREATE_OPTION_PREFIX}${categoryName}`;
}

export function isCreateOptionKey(key) {
  return typeof key === "string" && key.startsWith(CREATE_OPTION_PREFIX);
}

export function parseCreateOptionName(key) {
  return key.slice(CREATE_OPTION_PREFIX.length);
}
